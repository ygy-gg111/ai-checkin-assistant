import {NextRequest, NextResponse} from 'next/server';

import {apiError} from '@/lib/api-response';
import type {ApiErrorType} from '@/lib/api-response';

type ErrorDefinition = {
  status: number;
  message: string;
};

export const API_ERROR_DEFINITIONS: Record<ApiErrorType, ErrorDefinition> = {
  BAD_REQUEST: {status: 400, message: '请求内容不正确'},
  UNAUTHORIZED: {status: 401, message: '请先登录后再进行此操作'},
  SESSION_EXPIRED: {status: 401, message: '登录凭证已失效，请重新登录'},
  FORBIDDEN: {status: 403, message: '无权执行此操作'},
  NOT_FOUND: {status: 404, message: '请求的数据不存在'},
  CONFLICT: {status: 409, message: '数据状态冲突'},
  PAYLOAD_TOO_LARGE: {status: 413, message: '上传内容过大'},
  VALIDATION_ERROR: {status: 422, message: '请求数据校验失败'},
  TOO_MANY_REQUESTS: {status: 429, message: '请求过于频繁，请稍后重试'},
  DATABASE_ERROR: {status: 500, message: '数据库服务暂时不可用'},
  AI_SERVICE_ERROR: {status: 502, message: 'AI 服务暂时不可用，请稍后重试'},
  SERVICE_UNAVAILABLE: {status: 503, message: '服务暂时不可用，请稍后重试'},
  INTERNAL_ERROR: {status: 500, message: '服务异常，请稍后重试'},
};

export class ApiError extends Error {
  readonly type: ApiErrorType;
  readonly status: number;

  constructor(type: ApiErrorType, message?: string) {
    const definition = API_ERROR_DEFINITIONS[type];
    super(message ?? definition.message);
    this.name = 'ApiError';
    this.type = type;
    this.status = definition.status;
  }
}

type ApiHandler<TContext> = (
  request: NextRequest,
  context: TContext
) => Promise<NextResponse>;

export function withApiHandler<TContext>(handler: ApiHandler<TContext>) {
  return async (request: NextRequest, context: TContext) => {
    try {
      assertSameOriginForMutations(request);
      return await handler(request, context);
    } catch (error) {
      return handleApiError(error);
    }
  };
}

export function handleApiError(error: unknown) {
  if (error instanceof ApiError) {
    return apiError(error.message, error.status, error.status, error.type);
  }

  const prismaCode = getPrismaErrorCode(error);
  if (prismaCode === 'P2002') {
    const definition = API_ERROR_DEFINITIONS.CONFLICT;
    return apiError(definition.message, definition.status, definition.status, 'CONFLICT');
  }

  if (prismaCode === 'P2025') {
    const definition = API_ERROR_DEFINITIONS.NOT_FOUND;
    return apiError(definition.message, definition.status, definition.status, 'NOT_FOUND');
  }

  if (prismaCode && /^(P1000|P1001|P1002|P1008|P1017|P2024)$/.test(prismaCode)) {
    console.error('Database connection error:', prismaCode);
    const definition = API_ERROR_DEFINITIONS.DATABASE_ERROR;
    return apiError(definition.message, definition.status, definition.status, 'DATABASE_ERROR');
  }

  console.error('Unhandled API error:', error);
  const definition = API_ERROR_DEFINITIONS.INTERNAL_ERROR;
  return apiError(definition.message, definition.status, definition.status, 'INTERNAL_ERROR');
}

function getPrismaErrorCode(error: unknown) {
  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof error.code === 'string'
  ) {
    return error.code;
  }

  return null;
}

function assertSameOriginForMutations(request: NextRequest) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method.toUpperCase())) {
    return;
  }

  const origin = request.headers.get('origin');
  if (!origin) {
    throw new ApiError('FORBIDDEN', 'Cross-site request blocked');
  }

  const expectedOrigin = getExpectedRequestOrigin(request);
  if (origin === expectedOrigin) {
    return;
  }

  if (process.env.NODE_ENV !== 'production' && isEquivalentLocalOrigin(origin, expectedOrigin)) {
    return;
  }

  throw new ApiError('FORBIDDEN', 'Cross-site request blocked');
}

function getExpectedRequestOrigin(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const protocol = request.headers.get('x-forwarded-proto') ?? requestUrl.protocol.replace(/:$/, '');
  const host = request.headers.get('x-forwarded-host')
    ?? request.headers.get('host')
    ?? requestUrl.host;

  return `${protocol}://${host}`;
}

function isEquivalentLocalOrigin(origin: string, expectedOrigin: string) {
  try {
    const actualUrl = new URL(origin);
    const expectedUrl = new URL(expectedOrigin);

    if (
      actualUrl.protocol !== expectedUrl.protocol ||
      normalizePort(actualUrl) !== normalizePort(expectedUrl)
    ) {
      return false;
    }

    return isLocalHost(actualUrl.hostname) && isLocalHost(expectedUrl.hostname);
  } catch {
    return false;
  }
}

function normalizePort(url: URL) {
  if (url.port) {
    return url.port;
  }

  return url.protocol === 'https:' ? '443' : '80';
}

function isLocalHost(hostname: string) {
  return ['127.0.0.1', 'localhost', '::1'].includes(hostname);
}
