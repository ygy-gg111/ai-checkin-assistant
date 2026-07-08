import {NextRequest} from 'next/server';

import {ApiError} from '@/lib/api-handler';
import {withAuth} from '@/lib/auth/guard';
import {apiSuccess} from '@/lib/api-response';
import {prisma} from '@/lib/db';
import {MAX_PROMPT_TEMPLATE_CHARS} from '@/lib/prompt';

type PromptRouteContext = {params: Promise<{id: string}> | {id: string}};

export const PUT = withAuth(async (
  req: NextRequest,
  context: PromptRouteContext
) => {
  const resolvedParams = await Promise.resolve(context.params);
  const {id} = resolvedParams;

  if (!id) {
    throw new ApiError('VALIDATION_ERROR', '模板 ID 参数错误');
  }

  const body = await req.json().catch(() => ({}));
  const {name, content, isActive} = body;

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
  if (data.name && data.name.length > 100) {
    throw new ApiError('VALIDATION_ERROR', '模板名称不能超过 100 个字符');
  }
  if (data.content === '') {
    throw new ApiError('VALIDATION_ERROR', '模板内容不能为空');
  }
  if (data.content && data.content.length > MAX_PROMPT_TEMPLATE_CHARS) {
    throw new ApiError('VALIDATION_ERROR', `Prompt 模板不能超过 ${MAX_PROMPT_TEMPLATE_CHARS} 个字符`);
  }

  const updated = await prisma.promptTemplate.update({
    where: {id},
    data,
  });

  return apiSuccess(updated);
});

export const DELETE = withAuth(async (
  _req: NextRequest,
  context: PromptRouteContext
) => {
  const resolvedParams = await Promise.resolve(context.params);
  const {id} = resolvedParams;

  if (!id) {
    throw new ApiError('VALIDATION_ERROR', '模板 ID 参数错误');
  }

  const existing = await prisma.promptTemplate.findUnique({
    where: {id},
    select: {
      id: true,
      scene: true,
      version: true,
    },
  });

  if (!existing) {
    throw new ApiError('NOT_FOUND', 'Prompt 模板不存在');
  }

  if (isProtectedDefaultTemplate(existing.scene, existing.version)) {
    throw new ApiError('FORBIDDEN', '默认模板不允许删除');
  }

  await prisma.promptTemplate.delete({
    where: {id},
  });

  return apiSuccess({id}, '删除成功');
});

function isProtectedDefaultTemplate(scene: string, version: string) {
  return version === '1.0' && ['swimming', 'running', 'study', 'daily'].includes(scene);
}
