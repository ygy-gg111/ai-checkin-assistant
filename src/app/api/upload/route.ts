import {NextRequest} from 'next/server';
import {randomUUID} from 'crypto';
import {mkdir, writeFile} from 'fs/promises';
import path from 'path';

import {ApiError} from '@/lib/api-handler';
import {withAuth} from '@/lib/auth/guard';
import {apiSuccess} from '@/lib/api-response';
import {getUploadRoot} from '@/lib/storage/uploads';

export const runtime = 'nodejs';

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Map([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
]);

export const POST = withAuth(async (req: NextRequest) => {
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

    if (files.length > 9) {
      throw new ApiError('VALIDATION_ERROR', '最多支持同时上传 9 张图片');
    }

    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const uploadRoot = getUploadRoot();
    const targetDir = path.join(uploadRoot, String(year), month);
    await mkdir(targetDir, {recursive: true});

    const images = [];
    for (const file of files) {
      const ext = ALLOWED_IMAGE_TYPES.get(file.type);
      if (!ext) {
        throw new ApiError('VALIDATION_ERROR', '仅支持 JPG、PNG、WebP 图片');
      }
      if (file.size > MAX_FILE_SIZE) {
        throw new ApiError('PAYLOAD_TOO_LARGE', '单张图片不能超过 10MB');
      }

      const bytes = Buffer.from(await file.arrayBuffer());
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

function readImageDimensions(bytes: Buffer, mimeType: string) {
  if (mimeType === 'image/png' && bytes.length >= 24) {
    return {
      width: bytes.readUInt32BE(16),
      height: bytes.readUInt32BE(20),
    };
  }

  if (mimeType === 'image/jpeg') {
    const dimensions = readJpegDimensions(bytes);
    if (dimensions) {
      return {
        width: dimensions.width,
        height: dimensions.height,
      };
    }
  }

  return {
    width: null,
    height: null,
  };
}

function readJpegDimensions(bytes: Buffer) {
  let offset = 2;

  while (offset < bytes.length) {
    if (bytes[offset] !== 0xff) {
      return null;
    }

    const marker = bytes[offset + 1];
    const size = bytes.readUInt16BE(offset + 2);
    const isStartOfFrame = marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker);

    if (isStartOfFrame) {
      return {
        height: bytes.readUInt16BE(offset + 5),
        width: bytes.readUInt16BE(offset + 7),
      };
    }

    offset += 2 + size;
  }

  return null;
}
