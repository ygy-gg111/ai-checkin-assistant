import {NextRequest} from 'next/server';

import {ApiError} from '@/lib/api-handler';
import {withAuth} from '@/lib/auth/guard';
import {apiSuccess} from '@/lib/api-response';
import {getAIProvider} from '@/lib/ai';
import {prisma} from '@/lib/db';
import {formatPostDetail} from '@/lib/posts/format';

type InputImage = {
  url: string;
  width?: number | null;
  height?: number | null;
  size?: number | null;
  mimeType?: string | null;
};

export const POST = withAuth(async (req: NextRequest, _context, session) => {
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

    // 参数校验
    if (typeof topic !== 'string' || typeof inputText !== 'string' || !topic.trim() || !inputText.trim()) {
      throw new ApiError('VALIDATION_ERROR', '打卡主题(topic)和用户描述(inputText)为必填项');
    }
    const normalizedImages = normalizeImages(images);
    if (normalizedImages.length === 0) {
      throw new ApiError('VALIDATION_ERROR', '请传参至少一张打卡图片地址(images)');
    }

    const normalizedTopic = topic.trim();
    const normalizedPromptTemplateId = typeof promptTemplateId === 'string' ? promptTemplateId.trim() : '';

    const template = await prisma.promptTemplate.findFirst({
      where: {
        isActive: true,
        scene: normalizedTopic,
        ...(normalizedPromptTemplateId ? {id: normalizedPromptTemplateId} : {}),
      },
      orderBy: {version: 'desc'},
    });

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
        inputText: inputText.trim(),
        imageUrls: normalizedImages.map((image) => image.url),
        style: typeof style === 'string' ? style : 'normal',
        dayCount: parseDayCount(dayCount),
        promptTemplate: template?.content,
      });

      const post = await prisma.post.create({
        data: {
          userId: session.user.id,
          promptTemplateId: template?.id,
          topic: normalizedTopic,
          dayCount: parseDayCount(dayCount),
          style: typeof style === 'string' ? style : 'normal',
          inputText: inputText.trim(),
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
