import {NextRequest} from 'next/server';

import {ApiError} from '@/lib/api-handler';

const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const MAX_LOGIN_FAILURES = 5;
const DEFAULT_RATE_LIMIT_MESSAGE = 'Too many requests, please try again later';

type AttemptState = {
  count: number;
  resetAt: number;
};

const globalForRateLimit = globalThis as unknown as {
  loginAttempts: Map<string, AttemptState> | undefined;
  requestBuckets: Map<string, AttemptState> | undefined;
};

const loginAttempts = globalForRateLimit.loginAttempts ?? new Map<string, AttemptState>();
const requestBuckets = globalForRateLimit.requestBuckets ?? new Map<string, AttemptState>();

globalForRateLimit.loginAttempts = loginAttempts;
globalForRateLimit.requestBuckets = requestBuckets;

export function assertLoginAllowed(request: NextRequest, email: string) {
  const key = getLoginKey(request, email);
  const attempt = loginAttempts.get(key);
  const now = Date.now();

  if (!attempt || attempt.resetAt <= now) {
    loginAttempts.delete(key);
    return;
  }

  if (attempt.count >= MAX_LOGIN_FAILURES) {
    throwTooManyRequests();
  }
}

export function recordLoginFailure(request: NextRequest, email: string) {
  const key = getLoginKey(request, email);
  touchBucket(loginAttempts, key, LOGIN_WINDOW_MS);
}

export function clearLoginFailures(request: NextRequest, email: string) {
  loginAttempts.delete(getLoginKey(request, email));
}

export function assertRequestRateLimit(
  request: NextRequest,
  options: {
    bucket: string;
    max: number;
    windowMs: number;
    scope?: string;
  }
) {
  const key = `${options.bucket}:ip:${getClientIp(request)}${options.scope ? `:${options.scope}` : ''}`;
  assertBucketAllowed(requestBuckets, key, options.max, options.windowMs);
}

export function assertUserRateLimit(
  userId: string,
  options: {
    bucket: string;
    max: number;
    windowMs: number;
  }
) {
  const key = `${options.bucket}:user:${userId}`;
  assertBucketAllowed(requestBuckets, key, options.max, options.windowMs);
}

function assertBucketAllowed(
  store: Map<string, AttemptState>,
  key: string,
  max: number,
  windowMs: number
) {
  const now = Date.now();
  const current = store.get(key);

  if (!current || current.resetAt <= now) {
    store.set(key, {
      count: 1,
      resetAt: now + windowMs,
    });
    return;
  }

  if (current.count >= max) {
    throwTooManyRequests();
  }

  current.count += 1;
}

function touchBucket(store: Map<string, AttemptState>, key: string, windowMs: number) {
  const now = Date.now();
  const current = store.get(key);

  if (!current || current.resetAt <= now) {
    store.set(key, {
      count: 1,
      resetAt: now + windowMs,
    });
    return;
  }

  current.count += 1;
}

function getLoginKey(request: NextRequest, email: string) {
  return `login:${getClientIp(request)}:${email}`;
}

function getClientIp(request: NextRequest) {
  const forwardedFor = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return (
    forwardedFor ||
    request.headers.get('x-real-ip') ||
    request.headers.get('cf-connecting-ip') ||
    'unknown'
  );
}

function throwTooManyRequests() {
  throw new ApiError('TOO_MANY_REQUESTS', DEFAULT_RATE_LIMIT_MESSAGE);
}
