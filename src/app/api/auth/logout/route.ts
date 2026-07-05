import { NextRequest } from 'next/server';
import { apiSuccess } from '@/lib/api-response';

export async function POST(req: NextRequest) {
  // TODO: 1. 可在服务端记录 Token 失效（如用 Redis 黑名单机制等）
  // TODO: 2. 清除 HttpOnly Cookie
  const response = apiSuccess(null, '退出登录成功');
  response.cookies.delete('auth_token');
  return response;
}
