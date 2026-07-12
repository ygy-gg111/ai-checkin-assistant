export const MAX_UPLOAD_FILES = 9;
export const MAX_IMAGE_FILE_SIZE = 10 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = new Map([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
]);

export function assertUploadMetadata(file: {type: string; size: number}) {
  const extension = ALLOWED_IMAGE_TYPES.get(file.type);
  if (!extension) {
    throw new Error('仅支持 JPG、PNG、WebP 图片');
  }
  if (!Number.isFinite(file.size) || file.size <= 0 || file.size > MAX_IMAGE_FILE_SIZE) {
    throw new Error('单张图片不能超过 10MB');
  }
  return extension;
}

export function assertImageSignature(bytes: Buffer, mimeType: string) {
  const valid =
    (mimeType === 'image/jpeg' && isJpeg(bytes)) ||
    (mimeType === 'image/png' && isPng(bytes)) ||
    (mimeType === 'image/webp' && isWebp(bytes));

  if (!valid) {
    throw new Error('图片内容与文件类型不一致');
  }
}

export function readImageDimensions(bytes: Buffer, mimeType: string) {
  if (mimeType === 'image/png' && bytes.length >= 24) {
    return {
      width: bytes.readUInt32BE(16),
      height: bytes.readUInt32BE(20),
    };
  }

  if (mimeType === 'image/jpeg') {
    const dimensions = readJpegDimensions(bytes);
    if (dimensions) {
      return dimensions;
    }
  }

  return {width: null, height: null};
}

function isJpeg(bytes: Buffer) {
  return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
}

function isPng(bytes: Buffer) {
  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  return bytes.length >= signature.length && signature.every((value, index) => bytes[index] === value);
}

function isWebp(bytes: Buffer) {
  return bytes.length >= 16 &&
    bytes.toString('ascii', 0, 4) === 'RIFF' &&
    bytes.toString('ascii', 8, 12) === 'WEBP' &&
    ['VP8 ', 'VP8L', 'VP8X'].includes(bytes.toString('ascii', 12, 16));
}

function readJpegDimensions(bytes: Buffer) {
  let offset = 2;

  while (offset + 9 < bytes.length) {
    if (bytes[offset] !== 0xff) {
      return null;
    }

    const marker = bytes[offset + 1];
    const size = bytes.readUInt16BE(offset + 2);
    if (size < 2 || offset + size + 2 > bytes.length) {
      return null;
    }

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
