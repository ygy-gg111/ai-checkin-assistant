import {NextRequest} from 'next/server';

import {ApiError} from '@/lib/api-handler';
import {withAuth} from '@/lib/auth/guard';
import {apiSuccess} from '@/lib/api-response';

export const GET = withAuth(async (req: NextRequest) => {
    const {searchParams} = new URL(req.url);
    const now = new Date();
    const year = parseInt(searchParams.get('year') || String(now.getFullYear()), 10);
    const month = parseInt(searchParams.get('month') || String(now.getMonth() + 1), 10);
    const topic = searchParams.get('topic');

    if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
      throw new ApiError('VALIDATION_ERROR', '年份和月份参数不合法');
    }

    // TODO: 1. 依据 year 与 month 构建月份的首尾日期查询范围 (startDate, endDate)
    // TODO: 2. 在数据库中查询对应用户在该月份范围内的打卡记录 (Prisma Post.findMany)
    // TODO: 3. 按照日期对数据进行聚合统计，计算每日的打卡次数与包含的主题

    // 框架阶段：生成并模拟当月的日历基础结构与随机打卡记录
    const daysInMonth = new Date(year, month, 0).getDate();
    const days = [];

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      // 模拟第 1、3、12 天有打卡
      const isChecked = d === 1 || d === 3 || d === 12;
      days.push({
        date: dateStr,
        checked: isChecked,
        count: isChecked ? (d === 3 ? 2 : 1) : 0,
        topics: isChecked ? (d === 3 ? ['swimming', 'study'] : [topic || 'swimming']) : [],
      });
    }

    return apiSuccess({
      year,
      month,
      days,
    });
});
