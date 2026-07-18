import 'dotenv/config';

import {createHash} from 'crypto';
import {readFile, stat} from 'fs/promises';
import path from 'path';

import {HeadObjectCommand, PutObjectCommand, S3Client} from '@aws-sdk/client-s3';
import mysql, {type Connection, type RowDataPacket} from 'mysql2/promise';

type ImageRow = RowDataPacket & {
  id: string;
  url: string;
  userId: string;
  mimeType: string | null;
};

const apply = process.argv.includes('--apply');

async function main() {
  const local = await mysql.createConnection(requireEnvironmentVariable('LOCAL_DATABASE_URL'));
  const remote = apply
    ? await createTiDBConnection(requireEnvironmentVariable('TIDB_MIGRATION_DATABASE_URL'))
    : null;
  const bucket = requireEnvironmentVariable('R2_BUCKET');
  const publicBaseUrl = requireEnvironmentVariable('R2_PUBLIC_BASE_URL').replace(/\/+$/, '');
  const storage = createR2Client();

  try {
    const [images] = await local.query<ImageRow[]>(
      `SELECT pi.id, pi.url, pi.mimeType, p.userId
       FROM PostImage pi
       JOIN Post p ON p.id = pi.postId
       WHERE pi.url LIKE '/uploads/%'
       ORDER BY pi.id`,
    );

    console.log(`Found ${images.length} local image records.`);
    let uploaded = 0;
    let reused = 0;
    let updated = 0;
    let missing = 0;

    for (const image of images) {
      const source = resolveUploadPath(image.url);
      let file: Buffer;
      let metadata: Awaited<ReturnType<typeof stat>>;
      try {
        [file, metadata] = await Promise.all([readFile(source), stat(source)]);
      } catch (error) {
        if (typeof error === 'object' && error && 'code' in error && error.code === 'ENOENT') {
          console.warn(`[missing] ${image.url} (PostImage ${image.id})`);
          missing += 1;
          continue;
        }
        throw error;
      }
      const extension = path.extname(source).toLowerCase();
      const digest = createHash('sha256').update(file).digest('hex').slice(0, 20);
      const key = `uploads/${image.userId}/legacy/${digest}${extension}`;
      const publicUrl = `${publicBaseUrl}/${key.split('/').map(encodeURIComponent).join('/')}`;

      if (!apply) {
        console.log(`[dry-run] ${image.url} -> ${publicUrl}`);
        continue;
      }

      const exists = await objectExists(storage, bucket, key);
      if (!exists) {
        await storage.send(new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: file,
          ContentLength: metadata.size,
          ContentType: image.mimeType ?? inferContentType(extension),
        }));
        uploaded += 1;
      } else {
        reused += 1;
      }

      await updateImageUrl(remote!, image.id, image.url, publicUrl);
      await updateImageUrl(local, image.id, image.url, publicUrl);
      updated += 1;
    }

    if (!apply) {
      console.log(`Dry run complete: ${images.length - missing} ready, ${missing} missing.`);
      console.log('Re-run with --apply to upload and update database URLs.');
    } else {
      console.log(`Migration complete: ${uploaded} uploaded, ${reused} reused, ${updated} records updated, ${missing} missing.`);
    }
  } finally {
    await Promise.allSettled([local.end(), remote?.end()]);
  }
}

function resolveUploadPath(url: string) {
  const relative = url.split('/').filter(Boolean);
  if (relative[0] !== 'uploads' || relative.includes('..')) {
    throw new Error(`Unsafe local upload path: ${url}`);
  }
  return path.join(process.cwd(), ...relative);
}

async function updateImageUrl(connection: Connection, id: string, oldUrl: string, newUrl: string) {
  await connection.execute({
    sql: 'UPDATE `PostImage` SET `url` = ?, `updatedAt` = CURRENT_TIMESTAMP(3) WHERE `id` = ? AND `url` = ?',
    values: [newUrl, id, oldUrl],
    timeout: 15_000,
  });
}

async function objectExists(storage: S3Client, bucket: string, key: string) {
  try {
    await storage.send(new HeadObjectCommand({Bucket: bucket, Key: key}));
    return true;
  } catch (error) {
    if (typeof error === 'object' && error && '$metadata' in error) {
      const status = (error as {$metadata?: {httpStatusCode?: number}}).$metadata?.httpStatusCode;
      if (status === 404) return false;
    }
    throw error;
  }
}

function createR2Client() {
  return new S3Client({
    region: 'auto',
    endpoint: `https://${requireEnvironmentVariable('R2_ACCOUNT_ID')}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: requireEnvironmentVariable('R2_ACCESS_KEY_ID'),
      secretAccessKey: requireEnvironmentVariable('R2_SECRET_ACCESS_KEY'),
    },
  });
}

async function createTiDBConnection(value: string) {
  const url = new URL(value);
  return mysql.createConnection({
    host: url.hostname,
    port: Number(url.port || 4000),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace(/^\//, ''),
    connectTimeout: 20_000,
    ssl: {rejectUnauthorized: true},
  });
}

function inferContentType(extension: string) {
  const types: Record<string, string> = {
    '.gif': 'image/gif',
    '.jpeg': 'image/jpeg',
    '.jpg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
  };
  return types[extension] ?? 'application/octet-stream';
}

function requireEnvironmentVariable(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

main().catch((error: unknown) => {
  console.error('Image migration failed:', error instanceof Error ? error.message : 'Unknown error');
  process.exitCode = 1;
});
