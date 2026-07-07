import {NextRequest} from 'next/server';

import {withAuth} from '@/lib/auth/guard';
import {apiSuccess} from '@/lib/api-response';
import {calculateStreakStats, toDateKey} from '@/lib/calendar/stats';
import {prisma} from '@/lib/db';

const STREAK_GOAL = 30;

export const GET = withAuth(async (_req: NextRequest, _context, session) => {
  const posts = await prisma.post.findMany({
    where: {
      userId: session.user.id,
      status: {not: 'DELETED'},
    },
    select: {
      checkinDate: true,
    },
    orderBy: {checkinDate: 'asc'},
  });

  const {currentStreak} = calculateStreakStats(posts.map((post) => toDateKey(post.checkinDate)));
  const progressPercent = Math.min(Math.round((currentStreak / STREAK_GOAL) * 100), 100);

  return apiSuccess({
    currentStreak,
    streakGoal: STREAK_GOAL,
    progressPercent,
  });
});
