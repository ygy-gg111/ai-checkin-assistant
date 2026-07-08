import {NextRequest} from 'next/server';

import {ApiError} from '@/lib/api-handler';
import {withAuth} from '@/lib/auth/guard';
import {apiSuccess} from '@/lib/api-response';
import {prisma} from '@/lib/db';
import {MAX_PROMPT_PERSONA_CHARS} from '@/lib/prompt';
import {getMonthlyUsageStats} from '@/lib/usage/monthly';

const DEFAULT_PERSONA = '一个普通程序员的生活重启记录。下班去游泳，偶尔跑步，偶尔摆烂。不励志，只记录。';
const TOPICS = ['swimming', 'running', 'study', 'daily'];
const STYLES = ['natural', 'energetic', 'simple', 'warm'];
const MODELS = ['gpt-4o-mini', 'gpt-4o', 'claude-3-5-sonnet'];
const OUTPUT_LANGS = ['zh-CN', 'en'];
const STORAGE_METHODS = ['local', 'cloudflare-r2'];
const STORAGE_REGIONS = ['ap-east', 'us-east', 'eu-west'];

export const GET = withAuth(async (_req: NextRequest, _context, session) => {
  const [setting, stats] = await Promise.all([
    getOrCreateSetting(session.user.id),
    getUsageStats(session.user.id),
  ]);

  return apiSuccess({
    setting: formatSetting(setting),
    stats,
  });
});

export const PUT = withAuth(async (req: NextRequest, _context, session) => {
  const body = await req.json().catch(() => null) as {
    persona?: unknown;
    defaultTopic?: unknown;
    defaultStyle?: unknown;
    currentModel?: unknown;
    outputLang?: unknown;
    storageMethod?: unknown;
    storageRegion?: unknown;
  } | null;

  if (!body) {
    throw new ApiError('BAD_REQUEST', '请求内容必须是有效的 JSON');
  }

  const persona = getString(body.persona).trim();
  const defaultTopic = getEnumValue(body.defaultTopic, TOPICS, 'swimming');
  const defaultStyle = getEnumValue(body.defaultStyle, STYLES, 'natural');
  const currentModel = getEnumValue(body.currentModel, MODELS, 'gpt-4o-mini');
  const outputLang = getEnumValue(body.outputLang, OUTPUT_LANGS, 'zh-CN');
  const storageMethod = getEnumValue(body.storageMethod, STORAGE_METHODS, 'local');
  const storageRegion = getEnumValue(body.storageRegion, STORAGE_REGIONS, 'ap-east');

  if (!persona) {
    throw new ApiError('VALIDATION_ERROR', '账号人设不能为空');
  }

  if (persona.length > MAX_PROMPT_PERSONA_CHARS) {
    throw new ApiError('VALIDATION_ERROR', `账号人设不能超过 ${MAX_PROMPT_PERSONA_CHARS} 个字符`);
  }

  const setting = await prisma.userSetting.upsert({
    where: {userId: session.user.id},
    create: {
      userId: session.user.id,
      persona,
      defaultTopic,
      defaultStyle,
      aiProvider: 'openai',
      currentModel,
      outputLang,
      storageMethod,
      storageRegion,
    },
    update: {
      persona,
      defaultTopic,
      defaultStyle,
      currentModel,
      outputLang,
      storageMethod,
      storageRegion,
    },
  });

  return apiSuccess(formatSetting(setting));
});

async function getOrCreateSetting(userId: string) {
  return prisma.userSetting.upsert({
    where: {userId},
    create: {
      userId,
      persona: DEFAULT_PERSONA,
      defaultTopic: 'swimming',
      defaultStyle: 'natural',
      aiProvider: 'openai',
      currentModel: 'gpt-4o-mini',
      outputLang: 'zh-CN',
      storageMethod: 'local',
      storageRegion: 'ap-east',
    },
    update: {},
  });
}

const getUsageStats = getMonthlyUsageStats;

function formatSetting(setting: {
  persona: string;
  defaultTopic: string;
  defaultStyle: string;
  aiProvider: string;
  currentModel: string;
  outputLang: string;
  storageMethod: string;
  storageRegion: string;
}) {
  return {
    persona: setting.persona,
    defaultTopic: setting.defaultTopic,
    defaultStyle: setting.defaultStyle,
    aiProvider: setting.aiProvider,
    currentModel: setting.currentModel,
    outputLang: setting.outputLang,
    storageMethod: setting.storageMethod,
    storageRegion: setting.storageRegion,
  };
}

function getString(value: unknown) {
  return typeof value === 'string' ? value : '';
}

function getEnumValue(value: unknown, values: string[], fallback: string) {
  return typeof value === 'string' && values.includes(value) ? value : fallback;
}
