import {NextRequest} from 'next/server';

import {ApiError} from '@/lib/api-handler';
import {withAuth} from '@/lib/auth/guard';
import {assertUserRateLimit} from '@/lib/auth/rate-limit';
import {apiSuccess} from '@/lib/api-response';
import {assertUploadMetadata, MAX_UPLOAD_FILES} from '@/lib/storage/image-validation';
import {createR2UploadTarget, isR2StorageEnabled} from '@/lib/storage/r2';

type UploadCandidate = {name?: unknown; type?: unknown; size?: unknown};

export const POST = withAuth(async (req: NextRequest, _context, session) => {
  assertUserRateLimit(session.user.id, {bucket: 'upload', max: 40, windowMs: 15 * 60 * 1000});

  if (!isR2StorageEnabled()) {
    return apiSuccess({storage: 'local' as const});
  }

  const body = await req.json().catch(() => null) as {files?: UploadCandidate[]} | null;
  if (!body || !Array.isArray(body.files) || body.files.length === 0) {
    throw new ApiError('VALIDATION_ERROR', '请至少选择一张要上传的图片');
  }
  if (body.files.length > MAX_UPLOAD_FILES) {
    throw new ApiError('VALIDATION_ERROR', '最多支持同时上传 9 张图片');
  }

  const files = body.files.map((file) => {
    const name = typeof file.name === 'string' ? file.name : '';
    const type = typeof file.type === 'string' ? file.type : '';
    const size = typeof file.size === 'number' ? file.size : Number.NaN;
    try {
      assertUploadMetadata({type, size});
    } catch (error) {
      throw new ApiError('VALIDATION_ERROR', error instanceof Error ? error.message : undefined);
    }
    return {name, type, size};
  });

  const uploads = await Promise.all(files.map((file) => createR2UploadTarget(session.user.id, file)));
  return apiSuccess({storage: 'r2' as const, uploads});
});
