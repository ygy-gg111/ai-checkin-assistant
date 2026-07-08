import {NextRequest} from 'next/server';

import {withAuth} from '@/lib/auth/guard';
import {ApiError} from '@/lib/api-handler';
import {apiSuccess} from '@/lib/api-response';
import {prisma} from '@/lib/db';
import {MAX_PROMPT_TEMPLATE_CHARS} from '@/lib/prompt';
import {DEFAULT_PROMPT_TEMPLATES} from '@/lib/prompts/default-templates';

export const GET = withAuth(async (req: NextRequest) => {
  const {searchParams} = new URL(req.url);
  const scene = searchParams.get('scene');
  const includeInactive = searchParams.get('includeInactive') === '1';

  await ensureDefaultPromptTemplates();

  const data = await prisma.promptTemplate.findMany({
    where: {
      ...(includeInactive ? {} : {isActive: true}),
      ...(scene && scene !== 'all' ? {scene} : {}),
    },
    orderBy: [
      {scene: 'asc'},
      {updatedAt: 'desc'},
      {version: 'desc'},
    ],
  });

  return apiSuccess(data);
});

const SCENES = ['swimming', 'running', 'study', 'daily'] as const;

export const POST = withAuth(async (req: NextRequest) => {
  await ensureDefaultPromptTemplates();

  const body = await req.json().catch(() => null) as {
    name?: unknown;
    scene?: unknown;
    content?: unknown;
    isActive?: unknown;
  } | null;

  if (!body) {
    throw new ApiError('BAD_REQUEST', '请求内容必须是有效的 JSON');
  }

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const scene = typeof body.scene === 'string' ? body.scene.trim() : '';
  const content = typeof body.content === 'string' ? body.content.trim() : '';
  const isActive = typeof body.isActive === 'boolean' ? body.isActive : true;

  if (!name) {
    throw new ApiError('VALIDATION_ERROR', '模板名称不能为空');
  }
  if (!content) {
    throw new ApiError('VALIDATION_ERROR', '模板内容不能为空');
  }
  if (!SCENES.includes(scene as (typeof SCENES)[number])) {
    throw new ApiError('VALIDATION_ERROR', '模板主题不合法');
  }
  if (name.length > 100) {
    throw new ApiError('VALIDATION_ERROR', '模板名称不能超过 100 个字符');
  }
  if (content.length > MAX_PROMPT_TEMPLATE_CHARS) {
    throw new ApiError('VALIDATION_ERROR', `Prompt 模板不能超过 ${MAX_PROMPT_TEMPLATE_CHARS} 个字符`);
  }

  const existingTemplates = await prisma.promptTemplate.findMany({
    where: {scene},
    select: {version: true},
    orderBy: {version: 'desc'},
  });

  const created = await prisma.promptTemplate.create({
    data: {
      name,
      scene,
      version: getNextVersion(existingTemplates.map((template) => template.version)),
      content,
      isActive,
    },
  });

  return apiSuccess(created, '创建成功', 201);
});

async function ensureDefaultPromptTemplates() {
  const existing = await prisma.promptTemplate.findMany({
    where: {
      OR: DEFAULT_PROMPT_TEMPLATES.map((template) => ({
        scene: template.scene,
        version: template.version,
      })),
    },
    select: {
      scene: true,
      version: true,
    },
  });

  const existingKeys = new Set(existing.map((template) => `${template.scene}:${template.version}`));
  const missingTemplates = DEFAULT_PROMPT_TEMPLATES.filter(
    (template) => !existingKeys.has(`${template.scene}:${template.version}`)
  );

  if (missingTemplates.length === 0) {
    return;
  }

  await prisma.promptTemplate.createMany({
    data: missingTemplates.map((template) => ({
      ...template,
      isActive: true,
    })),
    skipDuplicates: true,
  });
}

function getNextVersion(existingVersions: string[]) {
  const ranked = existingVersions
    .map((version) => {
      const match = /^(\d+)(?:\.(\d+))?$/.exec(version.trim());
      if (!match) {
        return null;
      }

      const major = Number.parseInt(match[1], 10);
      const minor = Number.parseInt(match[2] ?? '0', 10);
      if (!Number.isFinite(major) || !Number.isFinite(minor)) {
        return null;
      }

      return {major, minor};
    })
    .filter((item): item is {major: number; minor: number} => item !== null)
    .sort((left, right) => {
      if (left.major !== right.major) {
        return right.major - left.major;
      }

      return right.minor - left.minor;
    });

  if (ranked.length === 0) {
    return '1.0';
  }

  const latest = ranked[0];
  return `${latest.major}.${latest.minor + 1}`;
}
