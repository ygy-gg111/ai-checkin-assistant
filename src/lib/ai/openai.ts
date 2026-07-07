import type {AIProvider, GeneratePostInput, GeneratePostResult} from './provider';

type OpenAIChatResponse = {
  choices?: {
    message?: {
      content?: string;
    };
  }[];
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
  error?: {
    message?: string;
  };
};

export class OpenAIProvider implements AIProvider {
  readonly name = 'openai';
  readonly model: string;

  private readonly apiKey: string;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    this.apiKey = apiKey;
    this.model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  }

  async generatePost(input: GeneratePostInput): Promise<GeneratePostResult> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        temperature: 0.7,
        response_format: {type: 'json_object'},
        messages: [
          {
            role: 'system',
            content: buildSystemPrompt(input.promptTemplate),
          },
          {
            role: 'user',
            content: buildUserPrompt(input),
          },
        ],
      }),
    });

    const data = await response.json().catch(() => null) as OpenAIChatResponse | null;
    if (!response.ok) {
      throw new Error(data?.error?.message || `OpenAI request failed with status ${response.status}`);
    }

    const content = data?.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('OpenAI response content is empty');
    }

    const parsed = parseResult(content);

    return {
      ...parsed,
      usage: {
        inputTokens: data?.usage?.prompt_tokens,
        outputTokens: data?.usage?.completion_tokens,
        totalTokens: data?.usage?.total_tokens,
      },
    };
  }
}

function buildSystemPrompt(template?: string) {
  return `${template || '你是小红书打卡内容生成助手，写作真实、自然、具体，不夸张营销。'}

请严格返回 JSON，不要输出 Markdown：
{
  "analysis": {
    "scene": "场景",
    "activity": "活动",
    "emotion": "情绪",
    "summary": "一句话总结"
  },
  "result": {
    "title": "20字以内标题",
    "content": "100到180字正文，分段自然",
    "tags": ["#标签1", "#标签2", "#标签3"],
    "coverText": "适合封面的短句"
  }
}`;
}

function buildUserPrompt(input: GeneratePostInput) {
  return [
    `主题：${input.topic}`,
    input.dayCount ? `打卡天数：Day ${input.dayCount}` : null,
    input.style ? `文案风格：${input.style}` : null,
    `用户描述：${input.inputText}`,
    input.imageUrls.length > 0 ? `图片地址：${input.imageUrls.join(', ')}` : null,
  ].filter(Boolean).join('\n');
}

function parseResult(content: string): GeneratePostResult {
  const parsed = JSON.parse(content) as {
    analysis?: Partial<GeneratePostResult['analysis']>;
    result?: {
      title?: unknown;
      content?: unknown;
      tags?: unknown;
      coverText?: unknown;
    };
  };

  const result = parsed.result;
  if (
    !parsed.analysis ||
    !result ||
    typeof result.title !== 'string' ||
    typeof result.content !== 'string' ||
    !Array.isArray(result.tags)
  ) {
    throw new Error('OpenAI response JSON schema is invalid');
  }

  return {
    analysis: {
      scene: typeof parsed.analysis.scene === 'string' ? parsed.analysis.scene : '',
      activity: typeof parsed.analysis.activity === 'string' ? parsed.analysis.activity : '',
      emotion: typeof parsed.analysis.emotion === 'string' ? parsed.analysis.emotion : '',
      summary: typeof parsed.analysis.summary === 'string' ? parsed.analysis.summary : '',
    },
    title: result.title,
    content: result.content,
    tags: result.tags.filter((tag): tag is string => typeof tag === 'string'),
    coverText: typeof result.coverText === 'string' ? result.coverText : undefined,
  };
}
