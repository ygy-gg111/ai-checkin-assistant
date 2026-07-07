import {NextRequest} from 'next/server';

import {ApiError} from '@/lib/api-handler';

const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const MAX_LOGIN_FAILURES = 5;

type LoginAttempt = {
  count: number;
  resetAt: number;
};

const globalForRateLimit = globalThis as unknown as {
  loginAttempts: Map<string, LoginAttempt> | undefined;
};

const loginAttempts = globalForRateLimit.loginAttempts ?? new Map<string, LoginAttempt>();

if (process.env.NODE_ENV !== 'production') {
  globalForRateLimit.loginAttempts = loginAttempts;
}

export function assertLoginAllowed(request: NextRequest, email: string) {
  const key = getLoginKey(request, email);
  const attempt = loginAttempts.get(key);
  const now = Date.now();

  if (!attempt || attempt.resetAt <= now) {
    loginAttempts.delete(key);
    return;
  }

  if (attempt.count >= MAX_LOGIN_FAILURES) {
    throw new ApiError('TOO_MANY_REQUESTS', '请求过于频繁，请稍后再试');
  }
}

export function recordLoginFailure(request: NextRequest, email: string) {
  const key = getLoginKey(request, email);
  const now = Date.now();
  const current = loginAttempts.get(key);

  if (!current || current.resetAt <= now) {
    loginAttempts.set(key, {
      count: 1,
      resetAt: now + LOGIN_WINDOW_MS,
    });
    return;
  }

  current.count += 1;
}

export function clearLoginFailures(request: NextRequest, email: string) {
  loginAttempts.delete(getLoginKey(request, email));
}

function getLoginKey(request: NextRequest, email: string) {
  return `${getClientIp(request)}:${email}`;
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
