import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '10', 10);
    const topic = searchParams.get('topic');
    const keyword = searchParams.get('keyword');

    // TODO: 1. 从登录态解析用户 ID (如果启用了多用户模式)
    // TODO: 2. 组装查询条件 where = { userId, topic, OR: [ { title: { contains: keyword } }, { content: { contains: keyword } } ] }
    // TODO: 3. 使用 Prisma 分页查询数据库 (Post.findMany + Post.count)
    // TODO: 4. 转换结构并返回（抽取第一张图片作为 coverImage）

    // 框架阶段：构造标准模拟分页历史列表数据
    const mockList = [
      {
        id: 'post_001',
        topic: topic || 'swimming',
        dayCount: 12,
        title: '下班后的45分钟，继续和水较劲',
        contentPreview: '今天是游泳打卡第12天。下班后还是去了泳池，主要练蛙泳腿...',
        coverText: 'Day 12｜下班去游泳',
        coverImage: '/uploads/mock/swim-01.jpg',
        tags: ['#游泳打卡', '#普通程序员', '#坚持100天'],
        createdAt: new Date().toISOString(),
      },
      {
        id: 'post_002',
        topic: topic || 'running',
        dayCount: 5,
        title: '5公里轻松跑，出汗的感觉真治愈',
        contentPreview: '晚上沿着河边慢慢跑完5公里，风很凉快，脑子也放空了...',
        coverText: 'Day 5｜夜跑5.0km',
        coverImage: '/uploads/mock/run-01.jpg',
        tags: ['#夜跑打卡', '#多巴胺', '#自律生活'],
        createdAt: new Date(Date.now() - 86400000).toISOString(),
      },
    ];

    return apiSuccess({
      list: mockList,
      pagination: {
        page,
        pageSize,
        total: 2,
      },
    });
  } catch (error) {
    return apiError('获取打卡历史列表异常', 500);
  }
}
