import {randomBytes, scrypt as scryptCallback, timingSafeEqual} from 'node:crypto';

const KEY_LENGTH = 64;
const HASH_PREFIX = 'scrypt';

function scrypt(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(password, salt, KEY_LENGTH, (error, derivedKey) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(derivedKey);
    });
  });
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = await scrypt(password, salt);

  return `${HASH_PREFIX}:${salt}:${derivedKey.toString('hex')}`;
}

export async function verifyPassword(password: string, storedHash: string) {
  const [prefix, salt, hash] = storedHash.split(':');

  if (prefix !== HASH_PREFIX || !salt || !hash) {
    return false;
  }

  const storedKey = Buffer.from(hash, 'hex');
  if (storedKey.length !== KEY_LENGTH) {
    return false;
  }

  const suppliedKey = await scrypt(password, salt);
  return timingSafeEqual(storedKey, suppliedKey);
}
