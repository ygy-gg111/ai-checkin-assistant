import {NextRequest} from 'next/server';

import {withAuth} from '@/lib/auth/guard';
import {apiSuccess} from '@/lib/api-response';
import {calculateStreakStats, toDateKey} from '@/lib/calendar/stats';
import {prisma} from '@/lib/db';
import {readOrFallback} from '@/lib/db/read-retry';
import {formatPostListItem} from '@/lib/posts/format';
import {APP_TIMEZONE, formatDateTz, midnightInTz} from '@/lib/timezone';
import {getMonthlyUsageStats} from '@/lib/usage/monthly';

export const GET = withAuth(async (req: NextRequest, _context, session) => {
  const now = new Date();
  const locale = req.nextUrl.searchParams.get('locale') === 'en' ? 'en' : 'zh-CN';
  const todayKey = formatDateTz(now); // YYYY-MM-DD in Shanghai
  const [curYear, curMonth] = todayKey.split('-').map(Number);
  const monthStart = midnightInTz(curYear, curMonth, 1);
  const nxtYear = curMonth === 12 ? curYear + 1 : curYear;
  const nxtMonth = curMonth === 12 ? 1 : curMonth + 1;
  const nextMonthStart = midnightInTz(nxtYear, nxtMonth, 1);

  const weekStart = startOfWeek(now);
  const weekDates = Array.from({length: 7}, (_, index) => addDays(weekStart, index));
  const weekStartKey = toDateKey(weekDates[0]);
  const weekEndKey = toDateKey(weekDates[6]);

  const baseWhere = {
    userId: session.user.id,
    status: {not: 'DELETED' as const},
  };
  const degradedSections: string[] = [];

  const [latestPosts, latestPost, totalGenerated, monthPosts, streakPosts, weekPosts, usageStats] = await Promise.all([
    readOrFallback(() => prisma.post.findMany({
      where: baseWhere,
      include: {images: {orderBy: {sortOrder: 'asc'}}},
      orderBy: {checkinDate: 'desc'},
      take: 3,
    }), [], 'recentPosts', degradedSections),
    readOrFallback(() => prisma.post.findFirst({
      where: baseWhere,
      select: {topic: true, dayCount: true},
      orderBy: {checkinDate: 'desc'},
    }), null, 'currentTopic', degradedSections),
    readOrFallback(() => prisma.post.count({where: baseWhere}), 0, 'totalGenerated', degradedSections),
    readOrFallback(() => prisma.post.findMany({
      where: {...baseWhere, checkinDate: {gte: monthStart, lt: nextMonthStart}},
      select: {checkinDate: true},
    }), [], 'monthlyCheckins', degradedSections),
    readOrFallback(() => prisma.post.findMany({
      where: baseWhere,
      select: {checkinDate: true},
      orderBy: {checkinDate: 'asc'},
    }), [], 'streak', degradedSections),
    readOrFallback(() => prisma.post.findMany({
      where: {...baseWhere, checkinDate: {gte: weekStart, lt: addDays(weekDates[6], 1)}},
      select: {checkinDate: true},
    }), [], 'weekly', degradedSections),
    readOrFallback(() => getMonthlyUsageStats(session.user.id), {
      monthLabel: `${curYear}.${String(curMonth).padStart(2, '0')}`,
      monthlyCalls: 0,
      callLimit: 100,
      callPercent: 0,
      totalTokens: 0,
      tokenLimit: 100000,
      tokenPercent: 0,
      postsGenerated: 0,
      postGoal: 50,
      postPercent: 0,
      estimatedCostCny: 0,
      provider: 'openai',
      model: 'gpt-4o-mini',
    }, 'usage', degradedSections),
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
    today: {
      date: toDateKey(now),
      displayDate: formatDashboardDate(now, locale),
    },
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
    degradedSections,
  });
});

function startOfWeek(date: Date) {
  // Get the current day of week in Asia/Shanghai timezone
  const shanghaiDay = new Intl.DateTimeFormat('en-US', {
    timeZone: APP_TIMEZONE,
    weekday: 'short',
  }).format(date);
  const dayMap: Record<string, number> = {
    Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6,
  };
  const offset = dayMap[shanghaiDay] ?? 0;
  // Get today's midnight in Shanghai, then subtract offset days
  const todayKey = formatDateTz(date);
  const [y, m, d] = todayKey.split('-').map(Number);
  const todayMidnight = midnightInTz(y, m, d);
  return new Date(todayMidnight.getTime() - offset * 86_400_000);
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 86_400_000);
}

function formatDashboardDate(date: Date, locale: 'zh-CN' | 'en') {
  if (locale === 'en') {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: APP_TIMEZONE,
      weekday: 'long',
      month: 'short',
      day: '2-digit',
    });
    const parts = formatter.formatToParts(date);
    const weekday = parts.find((part) => part.type === 'weekday')?.value ?? '';
    const month = parts.find((part) => part.type === 'month')?.value ?? '';
    const day = parts.find((part) => part.type === 'day')?.value ?? '';

    return `${weekday.toUpperCase()} · ${month.toUpperCase()} ${day}`;
  }

  const formatter = new Intl.DateTimeFormat('zh-CN', {
    timeZone: APP_TIMEZONE,
    month: '2-digit',
    day: '2-digit',
    weekday: 'long',
  });
  const parts = formatter.formatToParts(date);
  const month = parts.find((part) => part.type === 'month')?.value ?? '';
  const day = parts.find((part) => part.type === 'day')?.value ?? '';
  const weekday = parts.find((part) => part.type === 'weekday')?.value ?? '';

  return `${month}${day}日${weekday}`;
}
