import {NextRequest} from 'next/server';

import {ApiError} from '@/lib/api-handler';
import {withAuth} from '@/lib/auth/guard';
import {apiSuccess} from '@/lib/api-response';
import {prisma} from '@/lib/db';

export const GET = withAuth(async (req: NextRequest, _context, session) => {
  const topic = req.nextUrl.searchParams.get('topic')?.trim();

  if (!topic) {
    throw new ApiError('VALIDATION_ERROR', '打卡主题(topic)为必填项');
  }

  const where = {
    userId: session.user.id,
    topic,
    status: {not: 'DELETED' as const},
  };

  const [postCount, dayCountAggregate] = await Promise.all([
    prisma.post.count({where}),
    prisma.post.aggregate({
      where,
      _max: {dayCount: true},
    }),
  ]);

  const latestDayCount = dayCountAggregate._max.dayCount ?? 0;

  return apiSuccess({
    topic,
    postCount,
    nextDayCount: Math.max(postCount, latestDayCount) + 1,
  });
});
