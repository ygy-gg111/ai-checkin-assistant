import {NextRequest} from 'next/server';

import {ApiError} from '@/lib/api-handler';
import {withAuth} from '@/lib/auth/guard';
import {getAIProvider} from '@/lib/ai';
import {apiSuccess} from '@/lib/api-response';
import {
  clampPromptInputText,
  composePromptTemplate,
  MAX_PROMPT_INPUT_CHARS,
  MAX_PROMPT_PERSONA_CHARS,
  MAX_PROMPT_TEMPLATE_CHARS,
} from '@/lib/prompt';

const SCENES = ['swimming', 'running', 'study', 'daily'] as const;

export const POST = withAuth(async (req: NextRequest) => {
  const body = await req.json().catch(() => null) as {
    scene?: unknown;
    persona?: unknown;
    content?: unknown;
    inputText?: unknown;
  } | null;

  if (!body) {
    throw new ApiError('BAD_REQUEST', '请求内容必须是有效的 JSON');
  }

  const scene = typeof body.scene === 'string' ? body.scene.trim() : '';
  const persona = typeof body.persona === 'string' ? body.persona.trim() : '';
  const content = typeof body.content === 'string' ? body.content.trim() : '';
  const inputText = typeof body.inputText === 'string' ? body.inputText.trim() : '';

  if (!SCENES.includes(scene as (typeof SCENES)[number])) {
    throw new ApiError('VALIDATION_ERROR', '测试模板主题不合法');
  }
  if (!content) {
    throw new ApiError('VALIDATION_ERROR', '请先填写 Prompt 模板内容');
  }
  if (!inputText) {
    throw new ApiError('VALIDATION_ERROR', '请先填写测试输入');
  }
  if (persona.length > MAX_PROMPT_PERSONA_CHARS) {
    throw new ApiError('VALIDATION_ERROR', `账号人设不能超过 ${MAX_PROMPT_PERSONA_CHARS} 个字符`);
  }
  if (content.length > MAX_PROMPT_TEMPLATE_CHARS) {
    throw new ApiError('VALIDATION_ERROR', `Prompt 模板不能超过 ${MAX_PROMPT_TEMPLATE_CHARS} 个字符`);
  }
  if (inputText.length > MAX_PROMPT_INPUT_CHARS) {
    throw new ApiError('VALIDATION_ERROR', `测试输入不能超过 ${MAX_PROMPT_INPUT_CHARS} 个字符`);
  }

  const provider = getAIProvider();
  const result = await provider.generatePost({
    topic: scene,
    inputText: clampPromptInputText(inputText),
    imageUrls: [],
    promptTemplate: composePromptTemplate({persona, template: content}),
  });

  return apiSuccess({
    analysis: result.analysis,
    result: {
      title: result.title,
      content: result.content,
      tags: result.tags,
      coverText: result.coverText ?? '',
    },
    usage: result.usage ?? null,
    provider: provider.name,
    model: provider.model,
  });
});
