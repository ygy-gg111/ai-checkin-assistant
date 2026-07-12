import type {Prisma} from '@/generated/prisma/client';

type PromptTemplateRecord = {
  id: string;
  userId: string | null;
  name: string;
  scene: string;
  version: string;
  content: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type PromptTemplateView = {
  id: string;
  userId: string | null;
  isSystem: boolean;
  name: string;
  scene: string;
  version: string;
  content: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export function buildPromptTemplateReadScope(userId: string): Prisma.PromptTemplateWhereInput {
  return {
    OR: [
      {userId: null},
      {userId},
    ],
  };
}

export function makePromptTemplateKey(input: {
  userId: string | null;
  scene: string;
  version: string;
}) {
  const owner = input.userId ? `user:${input.userId}` : 'system';
  return `${owner}:${input.scene}:${input.version}`;
}

export function serializePromptTemplate(template: PromptTemplateRecord): PromptTemplateView {
  return {
    id: template.id,
    userId: template.userId,
    isSystem: template.userId === null,
    name: template.name,
    scene: template.scene,
    version: template.version,
    content: template.content,
    isActive: template.isActive,
    createdAt: template.createdAt.toISOString(),
    updatedAt: template.updatedAt.toISOString(),
  };
}

export function sortPromptTemplates<T extends {userId: string | null; scene: string; updatedAt: Date | string; version: string}>(templates: T[]) {
  return [...templates].sort((left, right) => {
    if (left.scene !== right.scene) {
      return left.scene.localeCompare(right.scene);
    }

    if ((left.userId === null) !== (right.userId === null)) {
      return left.userId === null ? 1 : -1;
    }

    const leftUpdatedAt = new Date(left.updatedAt).getTime();
    const rightUpdatedAt = new Date(right.updatedAt).getTime();
    if (leftUpdatedAt !== rightUpdatedAt) {
      return rightUpdatedAt - leftUpdatedAt;
    }

    return compareVersionsDesc(left.version, right.version);
  });
}

function compareVersionsDesc(left: string, right: string) {
  const leftRank = parseVersion(left);
  const rightRank = parseVersion(right);

  if (leftRank.major !== rightRank.major) {
    return rightRank.major - leftRank.major;
  }

  return rightRank.minor - leftRank.minor;
}

function parseVersion(version: string) {
  const match = /^(\d+)(?:\.(\d+))?$/.exec(version.trim());
  if (!match) {
    return {major: 0, minor: 0};
  }

  return {
    major: Number.parseInt(match[1], 10) || 0,
    minor: Number.parseInt(match[2] ?? '0', 10) || 0,
  };
}
