import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(context.params);
    const { id } = resolvedParams;

    if (!id) {
      return apiError('打卡记录 ID 参数错误', 400);
    }

    // TODO: 1. 依据 id 与 userId 查询数据库记录 (Prisma Post.findUnique({ where: { id }, include: { images: true } }))
    // TODO: 2. 若无对应数据则返回 404 (return apiError('打卡记录不存在', 404);)

    // 框架阶段：构造标准模拟打卡详情数据
    const mockDetail = {
      id,
      topic: 'swimming',
      dayCount: 12,
      style: 'normal',
      inputText: '今天练蛙泳，腿还是不怎么走水，不过感觉比昨天轻松一点。',
      images: [
        {
          id: 'img_001',
          url: '/uploads/mock/swim-01.jpg',
          width: 1080,
          height: 1440,
        },
        {
          id: 'img_002',
          url: '/uploads/mock/swim-02.jpg',
          width: 1080,
          height: 1440,
        },
      ],
      analysis: {
        scene: '室内泳池',
        activity: '游泳训练',
        emotion: '轻松',
        summary: '用户完成了一次蛙泳练习。',
      },
      title: '下班后的45分钟，继续和水较劲',
      content:
        '今天是游泳打卡第12天。下班后还是去了泳池，主要练蛙泳腿，虽然还是不太走水，但比昨天轻松了一点。不励志，也不装自律，就当普通程序员给自己重启一下。',
      tags: [
        '#游泳打卡',
        '#普通程序员',
        '#坚持100天',
        '#下班后生活',
        '#小红书日常',
      ],
      coverText: 'Day 12｜下班去游泳',
      provider: 'openai',
      model: 'gpt-4o-mini',
      createdAt: new Date().toISOString(),
    };

    return apiSuccess(mockDetail);
  } catch (error) {
    return apiError('获取打卡详情异常', 500);
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(context.params);
    const { id } = resolvedParams;

    if (!id) {
      return apiError('打卡记录 ID 参数错误', 400);
    }

    // TODO: 1. 检查是否存在该条数据并且是否有权限删除
    // TODO: 2. 物理删除 (Prisma Post.delete) 或软删除 (Prisma Post.update({ where: { id }, data: { status: 'DELETED' } }))

    return apiSuccess({ id }, '删除成功');
  } catch (error) {
    return apiError('删除打卡记录异常', 500);
  }
}
