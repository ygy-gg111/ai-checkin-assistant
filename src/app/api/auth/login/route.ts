import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { email, password } = body;

    if (!email || !password) {
      return apiError('请输入邮箱和密码', 400);
    }

    // TODO: 1. 依据邮箱查询用户 (Prisma User.findUnique)
    // TODO: 2. 校验用户密码是否正确
    // TODO: 3. 登录成功后签发 JWT 并注入 HttpOnly Cookie
    // 示例代码（待接入 Cookie 签发逻辑）：
    // const response = apiSuccess({ user: { id: user.id, email: user.email, name: user.name, avatar: user.avatar } });
    // response.cookies.set('token', jwtToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', path: '/' });

    // 框架阶段：返回规范示例数据
    const user = {
      id: 'user_001',
      email,
      name: '冠尧',
      avatar: null,
    };

    const response = apiSuccess({ user });
    // 模拟写入 HttpOnly Cookie
    response.cookies.set('auth_token', 'mock-jwt-token-val', {
      httpOnly: true,
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7天
    });

    return response;
  } catch (error) {
    return apiError('登录异常或服务错误', 500);
  }
}
