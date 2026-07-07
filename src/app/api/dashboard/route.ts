import {NextRequest} from 'next/server';

import {withAuth} from '@/lib/auth/guard';
import {apiSuccess} from '@/lib/api-response';
import {calculateStreakStats, toDateKey} from '@/lib/calendar/stats';
import {prisma} from '@/lib/db';
import {formatPostListItem} from '@/lib/posts/format';
import {getMonthlyUsageStats} from '@/lib/usage/monthly';

export const GET = withAuth(async (_req: NextRequest, _context, session) => {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const weekStart = startOfWeek(now);
  const weekDates = Array.from({length: 7}, (_, index) => addDays(weekStart, index));
  const weekStartKey = toDateKey(weekDates[0]);
  const weekEndKey = toDateKey(weekDates[6]);

  const baseWhere = {
    userId: session.user.id,
    status: {not: 'DELETED' as const},
  };

  const [
    latestPosts,
    latestPost,
    totalGenerated,
    monthPosts,
    streakPosts,
    weekPosts,
    usageStats,
  ] = await Promise.all([
    prisma.post.findMany({
      where: baseWhere,
      include: {
        images: {
          orderBy: {sortOrder: 'asc'},
        },
      },
      orderBy: {checkinDate: 'desc'},
      take: 3,
    }),
    prisma.post.findFirst({
      where: baseWhere,
      select: {
        topic: true,
        dayCount: true,
      },
      orderBy: {checkinDate: 'desc'},
    }),
    prisma.post.count({where: baseWhere}),
    prisma.post.findMany({
      where: {
        ...baseWhere,
        checkinDate: {
          gte: monthStart,
          lt: nextMonthStart,
        },
      },
      select: {
        checkinDate: true,
      },
    }),
    prisma.post.findMany({
      where: baseWhere,
      select: {
        checkinDate: true,
      },
      orderBy: {checkinDate: 'asc'},
    }),
    prisma.post.findMany({
      where: {
        ...baseWhere,
        checkinDate: {
          gte: weekStart,
          lt: addDays(weekDates[6], 1),
        },
      },
      select: {
        checkinDate: true,
      },
    }),
    getMonthlyUsageStats(session.user.id),
  ]);

  const monthlyCheckins = new Set(monthPosts.map((post) => toDateKey(post.checkinDate))).size;
  const {currentStreak} = calculateStreakStats(streakPosts.map((post) => toDateKey(post.checkinDate)));
  const currentTopic = latestPost?.topic ?? 'daily';
  const currentTopicDayCount = latestPost?.dayCount ?? null;

  const checkedWeekSet = new Set(weekPosts.map((post) => toDateKey(post.checkinDate)));
  const weekly = weekDates.map((date) => {
    const dateKey = toDateKey(date);
    return {
      date: dateKey,
      dayNumber: date.getDate(),
      checked: checkedWeekSet.has(dateKey),
      isToday: dateKey === toDateKey(now),
    };
  });

  return apiSuccess({
    stats: {
      streakDays: currentStreak,
      monthlyCheckins,
      generatedCount: usageStats.postsGenerated,
      totalGenerated,
      currentTopic,
      currentTopicDayCount,
    },
    recentPosts: latestPosts.map(formatPostListItem),
    weekly: {
      startDate: weekStartKey,
      endDate: weekEndKey,
      days: weekly,
    },
    usage: {
      monthlyCalls: usageStats.monthlyCalls,
      usageLimit: usageStats.callLimit,
      usagePercent: usageStats.callPercent,
      totalTokens: usageStats.totalTokens,
      provider: usageStats.provider,
      model: usageStats.model,
      estimatedCostCny: usageStats.estimatedCostCny,
    },
  });
});

function startOfWeek(date: Date) {
  const result = new Date(date);
  const day = (result.getDay() + 6) % 7;
  result.setHours(0, 0, 0, 0);
  result.setDate(result.getDate() - day);
  return result;
}

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}
