import {NextRequest} from 'next/server';

import {ApiError} from '@/lib/api-handler';
import {withAuth} from '@/lib/auth/guard';
import {apiSuccess} from '@/lib/api-response';
import {prisma} from '@/lib/db';
import {formatPostDetail} from '@/lib/posts/format';

type PostRouteContext = {params: Promise<{id: string}> | {id: string}};

export const GET = withAuth(async (
  req: NextRequest,
  context: PostRouteContext,
  session
) => {
    const resolvedParams = await Promise.resolve(context.params);
    const {id} = resolvedParams;

    if (!id) {
      throw new ApiError('VALIDATION_ERROR', '打卡记录 ID 参数错误');
    }

    const post = await prisma.post.findFirst({
      where: {
        id,
        userId: session.user.id,
        status: {not: 'DELETED'},
      },
      include: {
        images: {
          orderBy: {sortOrder: 'asc'},
        },
      },
    });

    if (!post) {
      throw new ApiError('NOT_FOUND', '打卡记录不存在');
    }

    return apiSuccess(formatPostDetail(post));
});

export const DELETE = withAuth(async (
  req: NextRequest,
  context: PostRouteContext,
  session
) => {
    const resolvedParams = await Promise.resolve(context.params);
    const {id} = resolvedParams;

    if (!id) {
      throw new ApiError('VALIDATION_ERROR', '打卡记录 ID 参数错误');
    }

    const post = await prisma.post.findFirst({
      where: {
        id,
        userId: session.user.id,
        status: {not: 'DELETED'},
      },
      select: {id: true},
    });

    if (!post) {
      throw new ApiError('NOT_FOUND', '打卡记录不存在');
    }

    await prisma.post.update({
      where: {id},
      data: {status: 'DELETED'},
    });

    return apiSuccess({id}, '删除成功');
});
