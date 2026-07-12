import {NextRequest} from 'next/server';

import {ApiError} from '@/lib/api-handler';
import {withAuth} from '@/lib/auth/guard';
import {assertUserRateLimit} from '@/lib/auth/rate-limit';
import {apiSuccess} from '@/lib/api-response';
import {getAIProvider} from '@/lib/ai';
import {prisma} from '@/lib/db';
import {formatPostDetail} from '@/lib/posts/format';
import {buildPromptTemplateReadScope} from '@/lib/prompts/templates';
import {
  clampPromptInputText,
  composePromptTemplate,
  MAX_PROMPT_INPUT_CHARS,
} from '@/lib/prompt';

type InputImage = {
  url: string;
  width?: number | null;
  height?: number | null;
  size?: number | null;
  mimeType?: string | null;
};

export const POST = withAuth(async (req: NextRequest, _context, session) => {
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

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    throw new ApiError('BAD_REQUEST', '请求内容必须是有效的 JSON');
  }

  const {
    topic,
    dayCount,
    style = 'normal',
    inputText,
    images = [],
    promptTemplateId,
  } = body;

  if (typeof topic !== 'string' || typeof inputText !== 'string' || !topic.trim() || !inputText.trim()) {
    throw new ApiError('VALIDATION_ERROR', '打卡主题(topic)和用户描述(inputText)为必填项');
  }
  if (inputText.trim().length > MAX_PROMPT_INPUT_CHARS) {
    throw new ApiError('VALIDATION_ERROR', `用户描述不能超过 ${MAX_PROMPT_INPUT_CHARS} 个字符`);
  }

  const normalizedImages = normalizeImages(images);
  if (normalizedImages.length === 0) {
    throw new ApiError('VALIDATION_ERROR', '请至少传入一张打卡图片地址(images)');
  }

  const normalizedTopic = topic.trim();
  const normalizedPromptTemplateId = typeof promptTemplateId === 'string' ? promptTemplateId.trim() : '';
  const normalizedInputText = clampPromptInputText(inputText);

  const [template, userSetting] = await Promise.all([
    prisma.promptTemplate.findFirst({
      where: {
        AND: [
          buildPromptTemplateReadScope(session.user.id),
          {
            isActive: true,
            scene: normalizedTopic,
            ...(normalizedPromptTemplateId ? {id: normalizedPromptTemplateId} : {}),
          },
        ],
      },
      orderBy: [
        {userId: 'desc'},
        {updatedAt: 'desc'},
        {version: 'desc'},
      ],
    }),
    prisma.userSetting.findUnique({
      where: {userId: session.user.id},
      select: {persona: true},
    }),
  ]);

  if (normalizedPromptTemplateId && !template) {
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
      topic: normalizedTopic,
      inputText: normalizedInputText,
      imageUrls: normalizedImages.map((image) => image.url),
      style: typeof style === 'string' ? style : 'normal',
      dayCount: parseDayCount(dayCount),
      promptTemplate: composePromptTemplate({
        persona: userSetting?.persona,
        template: template?.content,
      }),
    });

    const post = await prisma.post.create({
      data: {
        userId: session.user.id,
        promptTemplateId: template?.id,
        topic: normalizedTopic,
        dayCount: parseDayCount(dayCount),
        style: typeof style === 'string' ? style : 'normal',
        inputText: normalizedInputText,
        analysisJson: generated.analysis,
        title: generated.title,
        content: generated.content,
        tags: generated.tags,
        coverText: generated.coverText,
        provider: providerName,
        model,
        images: {
          create: normalizedImages.map((image, index) => ({
            url: image.url,
            width: image.width,
            height: image.height,
            size: image.size,
            mimeType: image.mimeType,
            sortOrder: index,
          })),
        },
      },
      include: {
        images: {
          orderBy: {sortOrder: 'asc'},
        },
      },
    });

    await prisma.aIUsageLog.create({
      data: {
        postId: post.id,
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
      postId: post.id,
      analysis: generated.analysis,
      result: {
        title: generated.title,
        content: generated.content,
        tags: generated.tags,
        coverText: generated.coverText,
      },
      post: formatPostDetail(post),
    });
  } catch (error) {
    await prisma.aIUsageLog.create({
      data: {
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

function parseDayCount(value: unknown) {
  if (typeof value === 'number' && Number.isInteger(value) && value > 0) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = parseInt(value, 10);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
  }

  return undefined;
}
