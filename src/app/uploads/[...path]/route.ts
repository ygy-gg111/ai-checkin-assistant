import {readFile} from 'fs/promises';
import path from 'path';
import {NextRequest, NextResponse} from 'next/server';

import {ApiError, handleApiError} from '@/lib/api-handler';
import {getUploadRoot} from '@/lib/storage/uploads';

export const runtime = 'nodejs';

type UploadRouteContext = {
  params: Promise<{path: string[]}> | {path: string[]};
};

const MIME_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

export async function GET(_req: NextRequest, context: UploadRouteContext) {
  try {
    const resolvedParams = await Promise.resolve(context.params);
    const segments = resolvedParams.path || [];
    if (segments.length === 0 || segments.some((segment) => segment.includes('..'))) {
      throw new ApiError('NOT_FOUND');
    }

    const uploadRoot = getUploadRoot();
    const filePath = path.resolve(uploadRoot, ...segments);
    if (!filePath.startsWith(`${uploadRoot}${path.sep}`)) {
      throw new ApiError('FORBIDDEN');
    }

    const ext = path.extname(filePath).toLowerCase();
    const mimeType = MIME_TYPES[ext];
    if (!mimeType) {
      throw new ApiError('NOT_FOUND');
    }

    const file = await readFile(filePath);
    return new NextResponse(file, {
      headers: {
        'Content-Type': mimeType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
