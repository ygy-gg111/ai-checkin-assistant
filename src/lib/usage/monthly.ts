import {prisma} from '@/lib/db';

export interface MonthlyUsageStats {
  monthLabel: string;
  monthlyCalls: number;
  callLimit: number;
  callPercent: number;
  totalTokens: number;
  tokenLimit: number;
  tokenPercent: number;
  postsGenerated: number;
  postGoal: number;
  postPercent: number;
  estimatedCostCny: number;
  provider: string;
  model: string;
}

export async function getMonthlyUsageStats(userId: string): Promise<MonthlyUsageStats> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const [postsGenerated, usageLogs] = await Promise.all([
    prisma.post.count({
      where: {
        userId,
        status: {not: 'DELETED'},
        checkinDate: {
          gte: monthStart,
          lt: nextMonthStart,
        },
      },
    }),
    prisma.aIUsageLog.findMany({
      where: {
        post: {userId},
        createdAt: {
          gte: monthStart,
          lt: nextMonthStart,
        },
      },
      select: {
        provider: true,
        model: true,
        totalTokens: true,
      },
      orderBy: {createdAt: 'desc'},
    }),
  ]);

  const monthlyCalls = usageLogs.length;
  const totalTokens = usageLogs.reduce((sum, log) => sum + (log.totalTokens ?? 0), 0);
  const callLimit = 100;
  const tokenLimit = 100000;
  const postGoal = 50;
  const latestUsage = usageLogs[0];

  return {
    monthLabel: `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}`,
    monthlyCalls,
    callLimit,
    callPercent: getPercent(monthlyCalls, callLimit),
    totalTokens,
    tokenLimit,
    tokenPercent: getPercent(totalTokens, tokenLimit),
    postsGenerated,
    postGoal,
    postPercent: getPercent(postsGenerated, postGoal),
    estimatedCostCny: estimateCostCny(totalTokens),
    provider: latestUsage?.provider ?? 'openai',
    model: latestUsage?.model ?? 'gpt-4o-mini',
  };
}

function getPercent(value: number, total: number) {
  return total > 0 ? Math.min(Math.round((value / total) * 100), 100) : 0;
}

function estimateCostCny(totalTokens: number) {
  const estimatedUsd = (totalTokens / 1000) * 0.0006;
  return Number((estimatedUsd * 7.2).toFixed(2));
}
