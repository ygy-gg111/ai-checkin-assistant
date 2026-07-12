import {NextRequest} from 'next/server';

import {ApiError} from '@/lib/api-handler';
import {withAuth} from '@/lib/auth/guard';
import {apiSuccess} from '@/lib/api-response';
import {prisma} from '@/lib/db';
import {MAX_PROMPT_TEMPLATE_CHARS} from '@/lib/prompt';
import {buildPromptTemplateReadScope, serializePromptTemplate} from '@/lib/prompts/templates';

type PromptRouteContext = {params: Promise<{id: string}> | {id: string}};

export const PUT = withAuth(async (
  req: NextRequest,
  context: PromptRouteContext,
  session
) => {
  const resolvedParams = await Promise.resolve(context.params);
  const {id} = resolvedParams;

  if (!id) {
    throw new ApiError('VALIDATION_ERROR', 'Template id is required');
  }

  const body = await req.json().catch(() => ({}));
  const {name, content, isActive} = body;

  if (!content && name === undefined && isActive === undefined) {
    throw new ApiError('VALIDATION_ERROR', 'No fields were provided to update');
  }

  const existing = await prisma.promptTemplate.findFirst({
    where: {
      AND: [
        {id},
        buildPromptTemplateReadScope(session.user.id),
      ],
    },
    select: {
      id: true,
      userId: true,
    },
  });

  if (!existing) {
    throw new ApiError('NOT_FOUND', 'Prompt template not found');
  }

  if (existing.userId !== session.user.id) {
    throw new ApiError('FORBIDDEN', 'System prompt templates cannot be edited');
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
    throw new ApiError('VALIDATION_ERROR', 'Template name is required');
  }
  if (data.name && data.name.length > 100) {
    throw new ApiError('VALIDATION_ERROR', 'Template name must be 100 characters or fewer');
  }
  if (data.content === '') {
    throw new ApiError('VALIDATION_ERROR', 'Template content is required');
  }
  if (data.content && data.content.length > MAX_PROMPT_TEMPLATE_CHARS) {
    throw new ApiError('VALIDATION_ERROR', `Prompt template must be ${MAX_PROMPT_TEMPLATE_CHARS} characters or fewer`);
  }

  const updated = await prisma.promptTemplate.update({
    where: {id},
    data,
  });

  return apiSuccess(serializePromptTemplate(updated));
});

export const DELETE = withAuth(async (
  _req: NextRequest,
  context: PromptRouteContext,
  session
) => {
  const resolvedParams = await Promise.resolve(context.params);
  const {id} = resolvedParams;

  if (!id) {
    throw new ApiError('VALIDATION_ERROR', 'Template id is required');
  }

  const existing = await prisma.promptTemplate.findFirst({
    where: {
      AND: [
        {id},
        buildPromptTemplateReadScope(session.user.id),
      ],
    },
    select: {
      id: true,
      userId: true,
    },
  });

  if (!existing) {
    throw new ApiError('NOT_FOUND', 'Prompt template not found');
  }

  if (existing.userId !== session.user.id) {
    throw new ApiError('FORBIDDEN', 'System prompt templates cannot be deleted');
  }

  await prisma.promptTemplate.delete({
    where: {id},
  });

  return apiSuccess({id}, 'Template deleted');
});
