import {NextRequest} from 'next/server';

import {withAuth} from '@/lib/auth/guard';
import {apiSuccess} from '@/lib/api-response';
import {prisma} from '@/lib/db';

const TOPICS = ['swimming', 'study', 'running', 'daily'];

export const GET = withAuth(async (_req: NextRequest, _context, session) => {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const where = {
    userId: session.user.id,
    status: {not: 'DELETED' as const},
  };

  const [total, monthly, posts, topicGroups] = await Promise.all([
    prisma.post.count({where}),
    prisma.post.count({
      where: {
        ...where,
        checkinDate: {
          gte: monthStart,
          lt: nextMonthStart,
        },
      },
    }),
    prisma.post.findMany({
      where,
      select: {
        content: true,
      },
    }),
    prisma.post.groupBy({
      by: ['topic'],
      where,
      _count: {
        topic: true,
      },
    }),
  ]);

  const totalWords = posts.reduce((sum, post) => sum + countContentWords(post.content), 0);
  const avgWords = posts.length > 0 ? Math.round(totalWords / posts.length) : 0;

  const topicCountMap = new Map(topicGroups.map((item) => [item.topic, item._count.topic]));
  const topicDistribution = TOPICS.map((topic) => {
    const count = topicCountMap.get(topic) ?? 0;
    return {
      topic,
      count,
      percent: total > 0 ? Math.round((count / total) * 100) : 0,
    };
  });

  return apiSuccess({
    total,
    monthly,
    avgWords,
    copyRate: null,
    topicDistribution,
  });
});

function countContentWords(content: string) {
  const normalized = content.trim();
  if (!normalized) {
    return 0;
  }

  const chineseChars = normalized.match(/[\u4e00-\u9fa5]/g)?.length ?? 0;
  const latinWords = normalized.match(/[A-Za-z0-9]+/g)?.length ?? 0;
  return chineseChars + latinWords;
}
