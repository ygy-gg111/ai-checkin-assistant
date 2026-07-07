import path from 'path';

export function getUploadRoot() {
  const configuredDir = process.env.UPLOAD_DIR || './uploads';

  if (path.isAbsolute(configuredDir)) {
    return path.resolve(configuredDir);
  }

  return path.join(/*turbopackIgnore: true*/ process.cwd(), configuredDir);
}
