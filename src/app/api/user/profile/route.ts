import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { name, avatar } = body;

    // TODO: 1. 从请求 Cookie/Header 解析登录态获取 userId
    // TODO: 2. 更新数据库记录 (Prisma User.update)

    // 框架阶段：返回规范示例数据
    const updatedUser = {
      id: 'user_001',
      name: name || '普通程序员',
      avatar: avatar || null,
    };

    return apiSuccess(updatedUser);
  } catch (error) {
    return apiError('更新用户个人资料失败', 500);
  }
}
