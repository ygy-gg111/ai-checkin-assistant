import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { email, password, name } = body;

    // 参数校验
    if (!email || !password) {
      return apiError('邮箱和密码不能为空', 400);
    }

    // TODO: 1. 检查数据库中邮箱是否已被注册 (Prisma User.findUnique)
    // TODO: 2. 对密码进行哈希加密 (例如可以使用 bcrypt / argon2)
    // TODO: 3. 创建新用户并保存至数据库 (Prisma User.create)

    // 框架阶段：返回规范示例数据
    const newUser = {
      id: 'user_001',
      email,
      name: name || email.split('@')[0],
    };

    return apiSuccess({ user: newUser });
  } catch (error) {
    return apiError('注册异常或服务错误', 500);
  }
}
