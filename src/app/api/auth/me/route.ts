import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get('auth_token')?.value;

    // TODO: 1. 校验并解析 Cookie 中的 JWT token
    // TODO: 2. 若无有效 token，在未登录接口规范下单用户模式可默认返回初始测试用户，或返回 401
    // if (!token) return apiError('未登录', 401);

    // 框架阶段：默认返回系统初始化测试用户信息
    const user = {
      id: 'user_001',
      email: 'test@example.com',
      name: '冠尧',
      avatar: null,
      createdAt: '2026-07-05T10:00:00.000Z',
    };

    return apiSuccess({ user });
  } catch (error) {
    return apiError('获取当前用户信息失败', 500);
  }
}
