import {NextRequest} from 'next/server';

import {ApiError} from '@/lib/api-handler';
import {withAuth} from '@/lib/auth/guard';
import {apiSuccess} from '@/lib/api-response';
import {prisma} from '@/lib/db';

export const PUT = withAuth(async (req: NextRequest, _context: unknown, {user}) => {
    const body = await req.json().catch(() => null) as {
      name?: unknown;
      avatar?: unknown;
    } | null;

    if (!body) {
      throw new ApiError('BAD_REQUEST', '请求内容必须是有效的 JSON');
    }

    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const avatar = typeof body.avatar === 'string' ? body.avatar.trim() : '';

    if (!name) {
      throw new ApiError('VALIDATION_ERROR', '昵称不能为空');
    }

    if (name.length > 100) {
      throw new ApiError('VALIDATION_ERROR', '昵称不能超过 100 个字符');
    }

    if (avatar.length > 2048) {
      throw new ApiError('VALIDATION_ERROR', '头像地址过长');
    }

    const updatedUser = await prisma.user.update({
      where: {id: user.id},
      data: {
        name,
        avatar: avatar || null,
      },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        createdAt: true,
      },
    });

    return apiSuccess(updatedUser);
});
