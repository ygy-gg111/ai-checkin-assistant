import 'dotenv/config';

import {
  GetBucketCorsCommand,
  PutBucketCorsCommand,
  S3Client,
  type CORSRule,
} from '@aws-sdk/client-s3';

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`R2 CORS command failed: ${message}`);
  process.exitCode = 1;
});

async function main() {
  const apply = process.argv.includes('--apply');
  const verify = process.argv.includes('--verify');
  const origins = readRepeatedArgument('--origin');

  if (origins.length === 0) {
    throw new Error('至少需要一个 --origin，例如 --origin https://ai-checkin-assistant.vercel.app');
  }

  for (const origin of origins) {
    const url = new URL(origin);
    if (!['http:', 'https:'].includes(url.protocol) || url.origin !== origin) {
      throw new Error(`Origin 必须是纯协议和域名，不能包含路径：${origin}`);
    }
  }

  const bucket = requireEnvironmentVariable('R2_BUCKET');
  const accountId = requireEnvironmentVariable('R2_ACCOUNT_ID');

  if (verify) {
    await verifyPreflight(accountId, bucket, origins);
    return;
  }

  const config = {
    accountId,
    accessKeyId: requireEnvironmentVariable('R2_ACCESS_KEY_ID'),
    secretAccessKey: requireEnvironmentVariable('R2_SECRET_ACCESS_KEY'),
    bucket,
  };

  const client = new S3Client({
    region: 'auto',
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });

  const desiredRule: CORSRule = {
    AllowedOrigins: origins,
    AllowedMethods: ['PUT'],
    AllowedHeaders: ['Content-Type'],
    ExposeHeaders: ['ETag'],
    MaxAgeSeconds: 3600,
  };

  const readCurrentRules = async () => {
    try {
      const response = await client.send(new GetBucketCorsCommand({Bucket: config.bucket}));
      return response.CORSRules ?? [];
    } catch (error) {
      if (isMissingCorsConfiguration(error)) {
        return [];
      }
      throw error;
    }
  };

  const current = await readCurrentRules();
  console.log('Current R2 CORS rules:');
  console.log(JSON.stringify(current, null, 2));
  console.log('Desired R2 CORS rules:');
  console.log(JSON.stringify([desiredRule], null, 2));

  if (!apply) {
    console.log('Dry run only. Re-run with --apply to update the bucket.');
    return;
  }

  await client.send(new PutBucketCorsCommand({
    Bucket: config.bucket,
    CORSConfiguration: {CORSRules: [desiredRule]},
  }));

  const updated = await readCurrentRules();
  console.log('Updated R2 CORS rules:');
  console.log(JSON.stringify(updated, null, 2));
}

function readRepeatedArgument(name: string) {
  const values: string[] = [];
  for (let index = 0; index < process.argv.length; index += 1) {
    if (process.argv[index] === name && process.argv[index + 1]) {
      values.push(process.argv[index + 1]);
      index += 1;
    }
  }
  return [...new Set(values)];
}

function requireEnvironmentVariable(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

function isMissingCorsConfiguration(error: unknown) {
  if (!error || typeof error !== 'object') {
    return false;
  }
  const candidate = error as {name?: string; $metadata?: {httpStatusCode?: number}};
  return candidate.name === 'NoSuchCORSConfiguration' || candidate.$metadata?.httpStatusCode === 404;
}

async function verifyPreflight(accountId: string, bucket: string, origins: string[]) {
  for (const origin of origins) {
    const response = await fetch(
      `https://${accountId}.r2.cloudflarestorage.com/${encodeURIComponent(bucket)}/cors-verification`,
      {
        method: 'OPTIONS',
        headers: {
          Origin: origin,
          'Access-Control-Request-Method': 'PUT',
          'Access-Control-Request-Headers': 'content-type',
        },
      },
    );

    const result = {
      origin,
      status: response.status,
      allowOrigin: response.headers.get('access-control-allow-origin'),
      allowMethods: response.headers.get('access-control-allow-methods'),
      allowHeaders: response.headers.get('access-control-allow-headers'),
    };
    console.log(JSON.stringify(result, null, 2));

    if (
      !response.ok
      || result.allowOrigin !== origin
      || !result.allowMethods?.split(',').some((method) => method.trim().toUpperCase() === 'PUT')
      || !result.allowHeaders?.split(',').some((header) => header.trim().toLowerCase() === 'content-type')
    ) {
      throw new Error(`CORS preflight verification failed for ${origin}`);
    }
  }
}
