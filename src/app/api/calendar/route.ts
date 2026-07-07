import {NextRequest} from 'next/server';

import {ApiError} from '@/lib/api-handler';
import {withAuth} from '@/lib/auth/guard';
import {apiSuccess} from '@/lib/api-response';
import {prisma} from '@/lib/db';

export const GET = withAuth(async (req: NextRequest, _context, session) => {
    const {searchParams} = new URL(req.url);
    const now = new Date();
    const year = parseInt(searchParams.get('year') || String(now.getFullYear()), 10);
    const month = parseInt(searchParams.get('month') || String(now.getMonth() + 1), 10);
    const topic = searchParams.get('topic');

    if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
      throw new ApiError('VALIDATION_ERROR', '年份和月份参数不合法');
    }

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);
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
      select: {
        topic: true,
        checkinDate: true,
      },
      orderBy: {checkinDate: 'asc'},
    });

    const grouped = posts.reduce<Record<string, {count: number; topics: Set<string>}>>((acc, post) => {
      const dateStr = toDateKey(post.checkinDate);
      acc[dateStr] ??= {count: 0, topics: new Set<string>()};
      acc[dateStr].count += 1;
      acc[dateStr].topics.add(post.topic);
      return acc;
    }, {});

    const daysInMonth = new Date(year, month, 0).getDate();
    const days = [];

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayStats = grouped[dateStr];
      days.push({
        date: dateStr,
        checked: !!dayStats,
        count: dayStats?.count ?? 0,
        topics: dayStats ? Array.from(dayStats.topics) : [],
      });
    }

    return apiSuccess({
      year,
      month,
      days,
    });
});

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
