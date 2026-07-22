import {NextRequest} from 'next/server';

import {ApiError} from '@/lib/api-handler';
import {withAuth} from '@/lib/auth/guard';
import {assertUserRateLimit} from '@/lib/auth/rate-limit';
import {apiSuccess} from '@/lib/api-response';
import {getAIProvider} from '@/lib/ai';
import {prisma} from '@/lib/db';
import {formatPostDetail, formatPostListItem} from '@/lib/posts/format';
import {formatDayTitle} from '@/lib/posts/title';
import {buildPromptTemplateReadScope} from '@/lib/prompts/templates';
import {
  clampPromptInputText,
  composePromptTemplate,
  MAX_PROMPT_INPUT_CHARS,
} from '@/lib/prompt';

type PostRouteContext = {params: Promise<{id: string}> | {id: string}};

type InputImage = {
  url: string;
  width?: number | null;
  height?: number | null;
  size?: number | null;
  mimeType?: string | null;
};

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

  const body = await req.json().catch(() => ({})) as Record<string, unknown>;

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

  const topicProvided = Object.prototype.hasOwnProperty.call(body, 'topic');
  const inputTextProvided = Object.prototype.hasOwnProperty.call(body, 'inputText');
  const imagesProvided = Object.prototype.hasOwnProperty.call(body, 'images');
  const promptTemplateProvided = Object.prototype.hasOwnProperty.call(body, 'promptTemplateId');

  const topic = topicProvided && typeof body.topic === 'string' ? body.topic.trim() : post.topic;
  const inputText = inputTextProvided && typeof body.inputText === 'string'
    ? body.inputText.trim()
    : post.inputText;
  const style = typeof body.style === 'string' && body.style.trim() ? body.style.trim() : post.style;
  const dayCount = post.dayCount ?? undefined;
  const images = imagesProvided
    ? normalizeImages(body.images)
    : post.images.map((image) => ({
        url: image.url,
        width: image.width,
        height: image.height,
        size: image.size,
        mimeType: image.mimeType,
      }));
  const promptTemplateId = typeof body.promptTemplateId === 'string' ? body.promptTemplateId.trim() : '';

  if (!topic || !inputText) {
    throw new ApiError('VALIDATION_ERROR', '打卡主题(topic)和用户描述(inputText)为必填项');
  }
  if (inputText.length > MAX_PROMPT_INPUT_CHARS) {
    throw new ApiError('VALIDATION_ERROR', `用户描述不能超过 ${MAX_PROMPT_INPUT_CHARS} 个字符`);
  }
  if (images.length === 0) {
    throw new ApiError('VALIDATION_ERROR', '请至少传入一张打卡图片地址(images)');
  }

  let nextPromptTemplate = post.promptTemplate;
  if (promptTemplateProvided || topic !== post.topic) {
    nextPromptTemplate = await prisma.promptTemplate.findFirst({
        where: {
          AND: [
            buildPromptTemplateReadScope(session.user.id),
            {
              ...(promptTemplateId ? {id: promptTemplateId} : {}),
              scene: topic,
              isActive: true,
            },
          ],
        },
        orderBy: [
          {userId: 'desc'},
          {updatedAt: 'desc'},
          {version: 'desc'},
        ],
      });
  }

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
      topic,
      inputText: clampPromptInputText(inputText),
      imageUrls: images.map((image) => image.url),
      style,
      dayCount,
      promptTemplate: composePromptTemplate({
        persona: userSetting?.persona,
        template: nextPromptTemplate?.content,
      }),
    });

    const title = formatDayTitle(dayCount, generated.title);

    const updatedPost = await prisma.post.update({
      where: {id: post.id},
      data: {
        promptTemplateId: nextPromptTemplate?.id ?? null,
        topic,
        style,
        inputText,
        analysisJson: generated.analysis,
        title,
        content: generated.content,
        tags: generated.tags,
        coverText: generated.coverText,
        provider: providerName,
        model,
        ...(imagesProvided ? {
          images: {
            deleteMany: {},
            create: images.map((image, index) => ({
              url: image.url,
              width: image.width,
              height: image.height,
              size: image.size,
              mimeType: image.mimeType,
              sortOrder: index,
            })),
          },
        } : {}),
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
    }).catch((error: unknown) => {
      console.error('Failed to write successful AI usage log', error);
    });

    return apiSuccess({
      postId: updatedPost.id,
      analysis: generated.analysis,
      result: {
        title,
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

function normalizeImages(value: unknown): InputImage[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (typeof item === 'string' && item.trim()) {
      return [{url: item.trim()}];
    }

    if (typeof item === 'object' && item !== null && 'url' in item && typeof item.url === 'string' && item.url.trim()) {
      return [{
        url: item.url.trim(),
        width: getOptionalNumber(item, 'width'),
        height: getOptionalNumber(item, 'height'),
        size: getOptionalNumber(item, 'size'),
        mimeType: getOptionalString(item, 'mimeType'),
      }];
    }

    return [];
  });
}

function getOptionalNumber(source: object, key: string) {
  const value = (source as Record<string, unknown>)[key];
  return typeof value === 'number' ? value : null;
}

function getOptionalString(source: object, key: string) {
  const value = (source as Record<string, unknown>)[key];
  return typeof value === 'string' ? value : null;
}
