import {NextRequest} from 'next/server';

import {withAuth} from '@/lib/auth/guard';
import {apiSuccess} from '@/lib/api-response';

export const PUT = withAuth(async (req: NextRequest, _context: unknown, {user}) => {
    const body = await req.json().catch(() => ({}));
    const {name, avatar} = body;

    // TODO: 1. 从请求 Cookie/Header 解析登录态获取 userId
    // TODO: 2. 更新数据库记录 (Prisma User.update)

    // 框架阶段：返回规范示例数据
    const updatedUser = {
      id: user.id,
      name: name || '普通程序员',
      avatar: avatar || null,
    };

    return apiSuccess(updatedUser);
});
