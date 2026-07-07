import {NextRequest} from 'next/server';

import {ApiError} from '@/lib/api-handler';
import {withAuth} from '@/lib/auth/guard';
import {apiSuccess} from '@/lib/api-response';
import {prisma} from '@/lib/db';
import {formatPostListItem} from '@/lib/posts/format';

export const GET = withAuth(async (req: NextRequest, _context, session) => {
  const {searchParams} = new URL(req.url);
  const page = parseInt(searchParams.get('page') || '1', 10);
  const pageSize = parseInt(searchParams.get('pageSize') || '10', 10);
  const topic = searchParams.get('topic');
  const keyword = searchParams.get('keyword');
  const style = searchParams.get('style');

  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) {
    throw new ApiError('VALIDATION_ERROR', '分页参数不合法');
  }

  const where = {
    userId: session.user.id,
    status: {not: 'DELETED' as const},
    ...(topic && topic !== 'all' ? {topic} : {}),
    ...(style && style !== 'all' ? {style} : {}),
    ...(keyword
      ? {
          OR: [
            {title: {contains: keyword}},
            {content: {contains: keyword}},
            {inputText: {contains: keyword}},
          ],
        }
      : {}),
  };

  const [posts, total] = await Promise.all([
    prisma.post.findMany({
      where,
      include: {
        images: {
          orderBy: {sortOrder: 'asc'},
        },
      },
      orderBy: {checkinDate: 'desc'},
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.post.count({where}),
  ]);

  return apiSuccess({
    list: posts.map(formatPostListItem),
    pagination: {
      page,
      pageSize,
      total,
    },
  });
});
