import {NextRequest} from 'next/server';

import {ApiError} from '@/lib/api-handler';
import {withAuth} from '@/lib/auth/guard';
import {apiSuccess} from '@/lib/api-response';
import {prisma} from '@/lib/db';

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

    const existing = await prisma.promptTemplate.findUnique({
      where: {id},
      select: {id: true},
    });

    if (!existing) {
      throw new ApiError('NOT_FOUND', 'Prompt 模板不存在');
    }

    const data: {
      name?: string;
      content?: string;
      isActive?: boolean;
    } = {};

    if (typeof name === 'string') {
      data.name = name.trim();
    }
    if (typeof content === 'string') {
      data.content = content;
    }
    if (typeof isActive === 'boolean') {
      data.isActive = isActive;
    }

    if (data.name === '') {
      throw new ApiError('VALIDATION_ERROR', '模板名称不能为空');
    }
    if (data.content === '') {
      throw new ApiError('VALIDATION_ERROR', '模板内容不能为空');
    }

    const updated = await prisma.promptTemplate.update({
      where: {id},
      data,
    });

    return apiSuccess(updated);
});
