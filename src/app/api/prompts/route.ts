import {NextRequest} from 'next/server';

import {withAuth} from '@/lib/auth/guard';
import {apiSuccess} from '@/lib/api-response';
import {prisma} from '@/lib/db';
import {DEFAULT_PROMPT_TEMPLATES} from '@/lib/prompts/default-templates';

export const GET = withAuth(async (req: NextRequest) => {
    const {searchParams} = new URL(req.url);
    const scene = searchParams.get('scene');

    await ensureDefaultPromptTemplates();

    const data = await prisma.promptTemplate.findMany({
      where: {
        isActive: true,
        ...(scene && scene !== 'all' ? {scene} : {}),
      },
      orderBy: [
        {scene: 'asc'},
        {version: 'desc'},
      ],
    });

    return apiSuccess(data);
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
