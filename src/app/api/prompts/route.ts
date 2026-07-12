import {NextRequest} from 'next/server';

import {withAuth} from '@/lib/auth/guard';
import {ApiError} from '@/lib/api-handler';
import {apiSuccess} from '@/lib/api-response';
import {prisma} from '@/lib/db';
import {MAX_PROMPT_TEMPLATE_CHARS} from '@/lib/prompt';
import {DEFAULT_PROMPT_TEMPLATES} from '@/lib/prompts/default-templates';
import {
  buildPromptTemplateReadScope,
  makePromptTemplateKey,
  serializePromptTemplate,
  sortPromptTemplates,
} from '@/lib/prompts/templates';

const SCENES = ['swimming', 'running', 'study', 'daily'] as const;

export const GET = withAuth(async (req: NextRequest, _context, session) => {
  const {searchParams} = new URL(req.url);
  const scene = searchParams.get('scene');
  const includeInactive = searchParams.get('includeInactive') === '1';

  await ensureDefaultPromptTemplates();

  const data = await prisma.promptTemplate.findMany({
    where: {
      AND: [
        buildPromptTemplateReadScope(session.user.id),
        ...(includeInactive ? [] : [{isActive: true}]),
        ...(scene && scene !== 'all' ? [{scene}] : []),
      ],
    },
    orderBy: [
      {scene: 'asc'},
      {userId: 'desc'},
      {updatedAt: 'desc'},
      {version: 'desc'},
    ],
  });

  return apiSuccess(sortPromptTemplates(data).map(serializePromptTemplate));
});

export const POST = withAuth(async (req: NextRequest, _context, session) => {
  await ensureDefaultPromptTemplates();

  const body = await req.json().catch(() => null) as {
    name?: unknown;
    scene?: unknown;
    content?: unknown;
    isActive?: unknown;
  } | null;

  if (!body) {
    throw new ApiError('BAD_REQUEST', 'Request body must be valid JSON');
  }

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const scene = typeof body.scene === 'string' ? body.scene.trim() : '';
  const content = typeof body.content === 'string' ? body.content.trim() : '';
  const isActive = typeof body.isActive === 'boolean' ? body.isActive : true;

  if (!name) {
    throw new ApiError('VALIDATION_ERROR', 'Template name is required');
  }
  if (!content) {
    throw new ApiError('VALIDATION_ERROR', 'Template content is required');
  }
  if (!SCENES.includes(scene as (typeof SCENES)[number])) {
    throw new ApiError('VALIDATION_ERROR', 'Template scene is invalid');
  }
  if (name.length > 100) {
    throw new ApiError('VALIDATION_ERROR', 'Template name must be 100 characters or fewer');
  }
  if (content.length > MAX_PROMPT_TEMPLATE_CHARS) {
    throw new ApiError('VALIDATION_ERROR', `Prompt template must be ${MAX_PROMPT_TEMPLATE_CHARS} characters or fewer`);
  }

  const existingTemplates = await prisma.promptTemplate.findMany({
    where: {
      userId: session.user.id,
      scene,
    },
    select: {version: true},
    orderBy: {version: 'desc'},
  });

  const version = getNextVersion(existingTemplates.map((template) => template.version));
  const created = await prisma.promptTemplate.create({
    data: {
      userId: session.user.id,
      templateKey: makePromptTemplateKey({
        userId: session.user.id,
        scene,
        version,
      }),
      name,
      scene,
      version,
      content,
      isActive,
    },
  });

  return apiSuccess(serializePromptTemplate(created), 'Template created', 201);
});

async function ensureDefaultPromptTemplates() {
  await Promise.all(
    DEFAULT_PROMPT_TEMPLATES.map((template) => {
      const templateKey = makePromptTemplateKey({
        userId: null,
        scene: template.scene,
        version: template.version,
      });

      return prisma.promptTemplate.upsert({
        where: {templateKey},
        update: {
          name: template.name,
          content: template.content,
          isActive: true,
        },
        create: {
          userId: null,
          templateKey,
          ...template,
          isActive: true,
        },
      });
    })
  );
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
