import {NextRequest} from 'next/server';
import {randomUUID} from 'crypto';
import {mkdir, writeFile} from 'fs/promises';
import path from 'path';

import {ApiError} from '@/lib/api-handler';
import {withAuth} from '@/lib/auth/guard';
import {assertUserRateLimit} from '@/lib/auth/rate-limit';
import {apiSuccess} from '@/lib/api-response';
import {assertImageSignature, assertUploadMetadata, MAX_UPLOAD_FILES, readImageDimensions} from '@/lib/storage/image-validation';
import {isR2StorageEnabled} from '@/lib/storage/r2';
import {getUploadRoot} from '@/lib/storage/uploads';
import {formatDateTz} from '@/lib/timezone';

export const runtime = 'nodejs';

export const POST = withAuth(async (req: NextRequest, _context, session) => {
    if (isR2StorageEnabled()) {
      throw new ApiError('SERVICE_UNAVAILABLE', '当前环境已启用云端存储，请使用 /api/upload/presign 接口');
    }

    assertUserRateLimit(session.user.id, {
      bucket: 'upload',
      max: 40,
      windowMs: 15 * 60 * 1000,
    });

    const formData = await req.formData();
    const files = formData.getAll('files').filter(isUploadFile);

    if (!files || files.length === 0) {
      // 兼容单文件字段名可能为 'file' 的情况
      const singleFile = formData.get('file');
      if (isUploadFile(singleFile)) {
        files.push(singleFile);
      }
    }

    if (files.length === 0) {
      throw new ApiError('VALIDATION_ERROR', '请至少选择一张要上传的图片');
    }

    if (files.length > MAX_UPLOAD_FILES) {
      throw new ApiError('VALIDATION_ERROR', '最多支持同时上传 9 张图片');
    }

    const now = new Date();
    const todayKey = formatDateTz(now); // YYYY-MM-DD in Shanghai
    const [year, month] = todayKey.split('-');
    const uploadRoot = getUploadRoot();
    const targetDir = path.join(uploadRoot, String(year), month);
    await mkdir(targetDir, {recursive: true});

    const images = [];
    for (const file of files) {
      const ext = assertUploadMetadata({type: file.type, size: file.size});

      const bytes = Buffer.from(await file.arrayBuffer());
      assertImageSignature(bytes, file.type);

      const dimensions = readImageDimensions(bytes, file.type);
      const uniqueName = `${Date.now()}-${randomUUID()}.${ext}`;
      await writeFile(path.join(targetDir, uniqueName), bytes);

      images.push({
        url: `/uploads/${year}/${month}/${uniqueName}`,
        width: dimensions.width,
        height: dimensions.height,
        size: file.size,
        mimeType: file.type,
        filename: file.name,
      });
    }

    return apiSuccess({images});
});

function isUploadFile(value: FormDataEntryValue | null): value is File {
  return value instanceof File && value.size > 0;
}
