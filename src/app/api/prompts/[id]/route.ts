import {NextRequest} from 'next/server';

import {ApiError} from '@/lib/api-handler';
import {withAuth} from '@/lib/auth/guard';
import {apiSuccess} from '@/lib/api-response';

export const PUT = withAuth(async (
  req: NextRequest,
  context: {params: Promise<{id: string}> | {id: string}}
) => {
    const resolvedParams = await Promise.resolve(context.params);
    const {id} = resolvedParams;

    if (!id) {
      throw new ApiError('VALIDATION_ERROR', '模板 ID 参数错误');
    }

    const body = await req.json().catch(() => ({}));
    const { name, content, isActive } = body;

    // 参数验证
    if (!content && name === undefined && isActive === undefined) {
      throw new ApiError('VALIDATION_ERROR', '未提交任何需要更新的字段');
    }

    // TODO: 1. 检查模板是否存在 (Prisma PromptTemplate.findUnique)
    // TODO: 2. 如果存在，更新内容并升级小版本号或更新 updatedAt (Prisma PromptTemplate.update)

    // 框架阶段：模拟返回操作成功并附带当前更新时间
    return apiSuccess({
      id,
      updatedAt: new Date().toISOString(),
    });
});
