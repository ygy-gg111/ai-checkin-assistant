import {randomUUID} from 'crypto';

import {DeleteObjectCommand, GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client} from '@aws-sdk/client-s3';
import {getSignedUrl} from '@aws-sdk/s3-request-presigner';

import {ApiError} from '@/lib/api-handler';
import {assertImageSignature, assertUploadMetadata, readImageDimensions} from '@/lib/storage/image-validation';

type UploadCandidate = {
  name: string;
  type: string;
  size: number;
};

export type R2UploadTarget = {
  key: string;
  uploadUrl: string;
  publicUrl: string;
  filename: string;
  mimeType: string;
  size: number;
};

type R2Config = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  publicBaseUrl: string;
};

let client: S3Client | null = null;

export function isR2StorageEnabled() {
  return process.env.STORAGE_PROVIDER === 'r2';
}

export async function createR2UploadTarget(userId: string, file: UploadCandidate): Promise<R2UploadTarget> {
  const extension = assertUploadMetadata(file);
  const config = getR2Config();
  const key = createObjectKey(userId, extension);
  const command = new PutObjectCommand({
    Bucket: config.bucket,
    Key: key,
    ContentType: file.type,
  });

  return {
    key,
    uploadUrl: await getSignedUrl(getR2Client(config), command, {expiresIn: 5 * 60}),
    publicUrl: toPublicUrl(config, key),
    filename: sanitizeFilename(file.name),
    mimeType: file.type,
    size: file.size,
  };
}

export async function verifyR2Upload(userId: string, key: string, filename: string) {
  const config = getR2Config();
  assertOwnedObjectKey(userId, key);

  const storage = getR2Client(config);
  try {
    const head = await storage.send(new HeadObjectCommand({Bucket: config.bucket, Key: key}));
    const mimeType = head.ContentType ?? '';
    const size = head.ContentLength ?? 0;

    try {
      assertUploadMetadata({type: mimeType, size});
    } catch (error) {
      throw new ApiError('VALIDATION_ERROR', error instanceof Error ? error.message : undefined);
    }

    const object = await storage.send(new GetObjectCommand({
      Bucket: config.bucket,
      Key: key,
      Range: 'bytes=0-65535',
    }));
    const bytes = await readObjectPrefix(object.Body);

    try {
      assertImageSignature(bytes, mimeType);
    } catch (error) {
      throw new ApiError('VALIDATION_ERROR', error instanceof Error ? error.message : undefined);
    }

    const dimensions = readImageDimensions(bytes, mimeType);
    return {
      url: toPublicUrl(config, key),
      width: dimensions.width,
      height: dimensions.height,
      size,
      mimeType,
      filename: sanitizeFilename(filename),
    };
  } catch (error) {
    try {
      await storage.send(new DeleteObjectCommand({Bucket: config.bucket, Key: key}));
    } catch (deleteError) {
      console.error(`Failed to delete invalid R2 object ${key}:`, deleteError);
    }
    throw error;
  }
}

function getR2Config(): R2Config {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET;
  const publicBaseUrl = process.env.R2_PUBLIC_BASE_URL?.replace(/\/+$/, '');

  if (!accountId || !accessKeyId || !secretAccessKey || !bucket || !publicBaseUrl) {
    throw new ApiError('SERVICE_UNAVAILABLE', '图片存储尚未配置');
  }

  return {accountId, accessKeyId, secretAccessKey, bucket, publicBaseUrl};
}

function getR2Client(config: R2Config) {
  if (!client) {
    client = new S3Client({
      region: 'auto',
      endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
  }
  return client;
}

function createObjectKey(userId: string, extension: string) {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  return `uploads/${userId}/${year}/${month}/${Date.now()}-${randomUUID()}.${extension}`;
}

function assertOwnedObjectKey(userId: string, key: string) {
  if (!key.startsWith(`uploads/${userId}/`) || key.includes('..')) {
    throw new ApiError('FORBIDDEN');
  }
}

function toPublicUrl(config: R2Config, key: string) {
  return `${config.publicBaseUrl}/${key.split('/').map(encodeURIComponent).join('/')}`;
}

function sanitizeFilename(value: string) {
  return value.replace(/[\\/\u0000-\u001f]/g, '_').slice(0, 255) || 'image';
}

async function readObjectPrefix(body: unknown) {
  if (!body || typeof body !== 'object' || !('transformToByteArray' in body)) {
    throw new ApiError('SERVICE_UNAVAILABLE', '图片存储读取失败');
  }

  const bytes = await (body as {transformToByteArray: () => Promise<Uint8Array>}).transformToByteArray();
  return Buffer.from(bytes);
}
