import {NextRequest} from 'next/server';

import {ApiError} from '@/lib/api-handler';
import {withAuth} from '@/lib/auth/guard';
import {apiSuccess} from '@/lib/api-response';
import {calculateStreakStats, toDateKey} from '@/lib/calendar/stats';
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
    const where = {
      userId: session.user.id,
      status: {not: 'DELETED' as const},
      ...(topic && topic !== 'all' ? {topic} : {}),
    };

    const [posts, streakPosts] = await Promise.all([
      prisma.post.findMany({
        where: {
          ...where,
          checkinDate: {
            gte: startDate,
            lt: endDate,
          },
        },
        select: {
          topic: true,
          checkinDate: true,
        },
        orderBy: {checkinDate: 'asc'},
      }),
      prisma.post.findMany({
        where,
        select: {
          checkinDate: true,
        },
        orderBy: {checkinDate: 'asc'},
      }),
    ]);

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

    const {currentStreak, longestStreak} = calculateStreakStats(
      streakPosts.map((post) => toDateKey(post.checkinDate))
    );

    return apiSuccess({
      year,
      month,
      days,
      stats: {
        monthlyCheckins: days.filter((day) => day.checked).length,
        monthlyGenerated: posts.length,
        currentStreak,
        longestStreak,
      },
    });
});
