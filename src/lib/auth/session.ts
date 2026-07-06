import {createPrivateKey, createPublicKey, generateKeyPairSync, sign, verify} from 'node:crypto';

// ---------------------------------------------------------------------------
// RS256 JWT utilities – zero external dependencies
// ---------------------------------------------------------------------------

const JWT_ALGORITHM = 'RS256';
const JWT_EXPIRY_SECONDS = 60 * 60 * 24 * 7; // 7 days

// ── Key-pair loading ────────────────────────────────────────────────────────

function base64UrlEncode(input: Buffer | string): string {
  const str = typeof input === 'string' ? Buffer.from(input) : input;
  return str.toString('base64url');
}

function base64UrlDecode(input: string): Buffer {
  return Buffer.from(input, 'base64url');
}

/**
 * Returns PEM-encoded private & public keys.
 *
 * Priority:
 * 1. Read `JWT_PRIVATE_KEY` / `JWT_PUBLIC_KEY` from env (PEM format, newlines
 *    may be encoded as `\n` literal in a single-line env variable).
 * 2. If both are missing, generate a fresh RSA-2048 key-pair on-the-fly and
 *    log a warning so developers know to persist them.
 */
function loadKeyPair(): {privateKeyPem: string; publicKeyPem: string} {
  let privatePem = process.env.JWT_PRIVATE_KEY?.replace(/\\n/g, '\n') ?? '';
  let publicPem = process.env.JWT_PUBLIC_KEY?.replace(/\\n/g, '\n') ?? '';

  if (privatePem && publicPem) {
    return {privateKeyPem: privatePem, publicKeyPem: publicPem};
  }

  if (privatePem || publicPem) {
    throw new Error('JWT_PRIVATE_KEY and JWT_PUBLIC_KEY must be configured together.');
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_PRIVATE_KEY and JWT_PUBLIC_KEY are required in production.');
  }

  // Auto-generate for local development convenience
  console.warn(
    '[auth/session] JWT_PRIVATE_KEY / JWT_PUBLIC_KEY not found in env – generating a temporary RSA-2048 key-pair. ' +
      'Set these variables in .env for production use.'
  );

  const pair = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {type: 'spki', format: 'pem'},
    privateKeyEncoding: {type: 'pkcs8', format: 'pem'},
  });

  privatePem = pair.privateKey as string;
  publicPem = pair.publicKey as string;

  return {privateKeyPem: privatePem, publicKeyPem: publicPem};
}

// Singleton – loaded once per process
let _keys: {privateKeyPem: string; publicKeyPem: string} | null = null;

function getKeys() {
  if (!_keys) {
    _keys = loadKeyPair();
  }
  return _keys;
}

// ── JWT sign / verify ───────────────────────────────────────────────────────

interface JwtPayload {
  sub: string; // userId
  iat: number;
  exp: number;
  [key: string]: unknown;
}

/**
 * Sign a JWT containing `{ sub: userId }` using the RS256 private key.
 */
export function signJwt(userId: string): string {
  const {privateKeyPem} = getKeys();

  const header = {alg: JWT_ALGORITHM, typ: 'JWT'};
  const now = Math.floor(Date.now() / 1000);
  const payload: JwtPayload = {
    sub: userId,
    iat: now,
    exp: now + JWT_EXPIRY_SECONDS,
  };

  const segments = [
    base64UrlEncode(JSON.stringify(header)),
    base64UrlEncode(JSON.stringify(payload)),
  ];

  const signingInput = segments.join('.');

  const privateKey = createPrivateKey(privateKeyPem);
  const signature = sign('sha256', Buffer.from(signingInput), privateKey);

  segments.push(base64UrlEncode(signature));
  return segments.join('.');
}

/**
 * Verify the JWT token using the RS256 public key.
 * Returns the decoded payload on success, or `null` on any failure
 * (invalid signature, expired, malformed, etc.).
 */
export function verifyJwt(token: string): JwtPayload | null {
  try {
    const {publicKeyPem} = getKeys();

    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [headerB64, payloadB64, signatureB64] = parts;

    // Verify header algorithm
    const header = JSON.parse(base64UrlDecode(headerB64).toString('utf-8'));
    if (header.alg !== JWT_ALGORITHM) return null;

    // Verify signature
    const signingInput = `${headerB64}.${payloadB64}`;
    const signature = base64UrlDecode(signatureB64);
    const publicKey = createPublicKey(publicKeyPem);

    const isValid = verify('sha256', Buffer.from(signingInput), publicKey, signature);
    if (!isValid) return null;

    // Parse payload
    const payload: JwtPayload = JSON.parse(base64UrlDecode(payloadB64).toString('utf-8'));

    if (
      typeof payload.sub !== 'string' ||
      !payload.sub ||
      typeof payload.iat !== 'number' ||
      typeof payload.exp !== 'number'
    ) {
      return null;
    }

    // Check expiry
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp <= now) return null;

    return payload;
  } catch {
    return null;
  }
}

// ── Cookie helpers ──────────────────────────────────────────────────────────

export const AUTH_COOKIE_NAME = 'auth_token';

export const AUTH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: JWT_EXPIRY_SECONDS,
};
