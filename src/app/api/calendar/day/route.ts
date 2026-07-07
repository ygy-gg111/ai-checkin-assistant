import {NextRequest} from 'next/server';

import {ApiError} from '@/lib/api-handler';
import {withAuth} from '@/lib/auth/guard';
import {apiSuccess} from '@/lib/api-response';
import {prisma} from '@/lib/db';
import {formatPostListItem} from '@/lib/posts/format';

export const GET = withAuth(async (req: NextRequest, _context, session) => {
    const {searchParams} = new URL(req.url);
    const date = searchParams.get('date');
    const topic = searchParams.get('topic');

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new ApiError('VALIDATION_ERROR', '请传入正确的日期格式参数 (YYYY-MM-DD)');
    }

    const [year, month, day] = date.split('-').map(Number);
    const startDate = new Date(year, month - 1, day);
    const endDate = new Date(year, month - 1, day + 1);
    const posts = await prisma.post.findMany({
      where: {
        userId: session.user.id,
        status: {not: 'DELETED'},
        checkinDate: {
          gte: startDate,
          lt: endDate,
        },
        ...(topic && topic !== 'all' ? {topic} : {}),
      },
      include: {
        images: {
          orderBy: {sortOrder: 'asc'},
        },
      },
      orderBy: {checkinDate: 'desc'},
    });

    return apiSuccess({
      date,
      list: posts.map(formatPostListItem),
    });
});
