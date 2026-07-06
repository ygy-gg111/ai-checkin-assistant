import {NextRequest} from 'next/server';

import {ApiError} from '@/lib/api-handler';
import {withAuth} from '@/lib/auth/guard';
import {apiSuccess} from '@/lib/api-response';

export const POST = withAuth(async (
  req: NextRequest,
  context: {params: Promise<{id: string}> | {id: string}}
) => {
    const resolvedParams = await Promise.resolve(context.params);
    const {id} = resolvedParams;

    if (!id) {
      throw new ApiError('VALIDATION_ERROR', '打卡记录 ID 参数错误');
    }

    const body = await req.json().catch(() => ({}));
    const { style = 'normal', promptTemplateId } = body;

    // TODO: 1. 根据 id 从数据库中读取原始的 inputText 与图片信息 (Prisma Post.findUnique)
    // TODO: 2. 如果指定了新的 promptTemplateId 或 style，重构 AI 调用入参
    // TODO: 3. 调用 AI Provider (如 OpenAI) 从新生成文案
    // TODO: 4. 更新数据库中该 Post 的记录信息 (Prisma Post.update) 或创建新的生成历史
    // TODO: 5. 记录 AI 使用日志 (Prisma AIUsageLog.create)

    // 框架阶段：返回规范模拟重新生成结构
    const regenerateData = {
      postId: id,
      result: {
        title: style === 'funny' 
          ? '牛马下班后的泳池重启计划，主打一个灵魂慢半拍' 
          : '重新梳理节奏，在水声中找回自己',
        content: `今天继续去游泳，换了一种心态记录。\n\n主打一个人到泳池，灵魂慢半拍。工作里想不通的 Bug，在水下蹬腿的那一刻全忘了。不管是第几天，只要在水里就是胜利！`,
        tags: [
          '#游泳打卡',
          '#牛马日常',
          '#普通程序员',
          '#下班去哪儿',
        ],
        coverText: style === 'funny' ? '牛马重启 Day 12' : '在水里找回节奏',
      },
    };

    return apiSuccess(regenerateData);
});
