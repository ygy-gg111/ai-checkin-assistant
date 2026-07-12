import {NextRequest} from 'next/server';

import {ApiError} from '@/lib/api-handler';
import {withAuth} from '@/lib/auth/guard';
import {assertUserRateLimit} from '@/lib/auth/rate-limit';
import {apiSuccess} from '@/lib/api-response';
import {getAIProvider} from '@/lib/ai';
import {prisma} from '@/lib/db';
import {formatPostDetail, formatPostListItem} from '@/lib/posts/format';
import {buildPromptTemplateReadScope} from '@/lib/prompts/templates';
import {clampPromptInputText, composePromptTemplate} from '@/lib/prompt';

type PostRouteContext = {params: Promise<{id: string}> | {id: string}};

export const POST = withAuth(async (
  req: NextRequest,
  context: PostRouteContext,
  session
) => {
  assertUserRateLimit(session.user.id, {
    bucket: 'ai-content-burst',
    max: 5,
    windowMs: 5 * 60 * 1000,
  });
  assertUserRateLimit(session.user.id, {
    bucket: 'ai-content-hour',
    max: 20,
    windowMs: 60 * 60 * 1000,
  });

  const resolvedParams = await Promise.resolve(context.params);
  const {id} = resolvedParams;

  if (!id) {
    throw new ApiError('VALIDATION_ERROR', '打卡记录 ID 参数错误');
  }

  const body = await req.json().catch(() => ({}));
  const style = typeof body.style === 'string' ? body.style : 'normal';
  const promptTemplateId = typeof body.promptTemplateId === 'string' ? body.promptTemplateId.trim() : '';

  const [post, userSetting] = await Promise.all([
    prisma.post.findFirst({
      where: {
        id,
        userId: session.user.id,
        status: {not: 'DELETED'},
      },
      include: {
        images: {
          orderBy: {sortOrder: 'asc'},
        },
        promptTemplate: true,
      },
    }),
    prisma.userSetting.findUnique({
      where: {userId: session.user.id},
      select: {persona: true},
    }),
  ]);

  if (!post) {
    throw new ApiError('NOT_FOUND', '打卡记录不存在');
  }

  const nextPromptTemplate = promptTemplateId
    ? await prisma.promptTemplate.findFirst({
        where: {
          AND: [
            buildPromptTemplateReadScope(session.user.id),
            {
              id: promptTemplateId,
              scene: post.topic,
              isActive: true,
            },
          ],
        },
        orderBy: [
          {userId: 'desc'},
          {updatedAt: 'desc'},
          {version: 'desc'},
        ],
      })
    : post.promptTemplate;

  if (promptTemplateId && !nextPromptTemplate) {
    throw new ApiError('VALIDATION_ERROR', '所选 Prompt 模板不存在、未启用，或与当前打卡主题不匹配');
  }

  let providerName = 'openai';
  let model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  const startedAt = Date.now();

  try {
    const provider = getAIProvider();
    providerName = provider.name;
    model = provider.model;

    const generated = await provider.generatePost({
      topic: post.topic,
      inputText: clampPromptInputText(post.inputText),
      imageUrls: post.images.map((image) => image.url),
      style,
      dayCount: post.dayCount ?? undefined,
      promptTemplate: composePromptTemplate({
        persona: userSetting?.persona,
        template: nextPromptTemplate?.content,
      }),
    });

    const updatedPost = await prisma.post.update({
      where: {id: post.id},
      data: {
        promptTemplateId: nextPromptTemplate?.id ?? null,
        style,
        analysisJson: generated.analysis,
        title: generated.title,
        content: generated.content,
        tags: generated.tags,
        coverText: generated.coverText,
        provider: providerName,
        model,
      },
      include: {
        images: {
          orderBy: {sortOrder: 'asc'},
        },
      },
    });

    await prisma.aIUsageLog.create({
      data: {
        postId: updatedPost.id,
        provider: providerName,
        model,
        success: true,
        inputTokens: generated.usage?.inputTokens,
        outputTokens: generated.usage?.outputTokens,
        totalTokens: generated.usage?.totalTokens,
        durationMs: Date.now() - startedAt,
      },
    });

    return apiSuccess({
      postId: updatedPost.id,
      analysis: generated.analysis,
      result: {
        title: generated.title,
        content: generated.content,
        tags: generated.tags,
        coverText: generated.coverText,
      },
      post: formatPostDetail(updatedPost),
      listItem: formatPostListItem(updatedPost),
    });
  } catch (error) {
    await prisma.aIUsageLog.create({
      data: {
        postId: post.id,
        provider: providerName,
        model,
        success: false,
        errorCode: 'AI_SERVICE_ERROR',
        errorMessage: error instanceof Error ? error.message : 'Unknown AI provider error',
        durationMs: Date.now() - startedAt,
      },
    }).catch(() => null);

    throw new ApiError('AI_SERVICE_ERROR');
  }
});
