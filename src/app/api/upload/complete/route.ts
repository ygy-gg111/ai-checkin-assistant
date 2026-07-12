import {NextRequest} from 'next/server';

import {ApiError} from '@/lib/api-handler';
import {withAuth} from '@/lib/auth/guard';
import {assertUserRateLimit} from '@/lib/auth/rate-limit';
import {apiSuccess} from '@/lib/api-response';
import {MAX_UPLOAD_FILES} from '@/lib/storage/image-validation';
import {isR2StorageEnabled, verifyR2Upload} from '@/lib/storage/r2';

type CompletedUpload = {key?: unknown; filename?: unknown};

export const POST = withAuth(async (req: NextRequest, _context, session) => {
  assertUserRateLimit(session.user.id, {bucket: 'upload', max: 40, windowMs: 15 * 60 * 1000});

  if (!isR2StorageEnabled()) {
    throw new ApiError('SERVICE_UNAVAILABLE', '当前环境未启用云端图片存储');
  }

  const body = await req.json().catch(() => null) as {uploads?: CompletedUpload[]} | null;
  if (!body || !Array.isArray(body.uploads) || body.uploads.length === 0) {
    throw new ApiError('VALIDATION_ERROR', '上传确认参数不正确');
  }
  if (body.uploads.length > MAX_UPLOAD_FILES) {
    throw new ApiError('VALIDATION_ERROR', '最多支持同时上传 9 张图片');
  }

  const uploads = body.uploads.map((upload) => {
    if (typeof upload.key !== 'string' || typeof upload.filename !== 'string') {
      throw new ApiError('VALIDATION_ERROR', '上传确认参数不正确');
    }
    return {key: upload.key, filename: upload.filename};
  });

  const images = await Promise.all(uploads.map((upload) => verifyR2Upload(session.user.id, upload.key, upload.filename)));
  return apiSuccess({images});
});
