import {NextRequest} from 'next/server';

import {ApiError} from '@/lib/api-handler';
import {withAuth} from '@/lib/auth/guard';
import {apiSuccess} from '@/lib/api-response';

export const GET = withAuth(async (req: NextRequest) => {
    const {searchParams} = new URL(req.url);
    const date = searchParams.get('date');
    const topic = searchParams.get('topic');

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new ApiError('VALIDATION_ERROR', '请传入正确的日期格式参数 (YYYY-MM-DD)');
    }

    // TODO: 1. 依据 date 构造该日期的 00:00:00 到 23:59:59 的时间查询范围
    // TODO: 2. 查询数据库中符合指定日期范围及 topic 条件的 Post 列表 (Prisma Post.findMany)

    // 框架阶段：返回模拟单日打卡列表数据
    const mockList = [
      {
        id: `post_${date.replace(/-/g, '')}_01`,
        topic: topic || 'swimming',
        dayCount: 12,
        title: '下班后的45分钟，继续和水较劲',
        coverImage: '/uploads/mock/swim-01.jpg',
        coverText: 'Day 12｜下班去游泳',
        tags: ['#游泳打卡', '#普通程序员'],
        createdAt: `${date}T20:30:00.000Z`,
      },
    ];

    return apiSuccess({
      date,
      list: mockList,
    });
});
