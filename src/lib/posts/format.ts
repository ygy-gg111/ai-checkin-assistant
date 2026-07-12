import type {Prisma} from '@/generated/prisma/client';
import {formatDateTz, formatTimeTz} from '@/lib/timezone';

type PostWithImages = {
  id: string;
  topic: string;
  dayCount: number | null;
  style: string;
  inputText: string;
  analysisJson: Prisma.JsonValue | null;
  title: string;
  content: string;
  tags: Prisma.JsonValue;
  coverText: string | null;
  provider: string;
  model: string;
  checkinDate: Date;
  createdAt: Date;
  images: {
    id: string;
    url: string;
    width: number | null;
    height: number | null;
    size: number | null;
    mimeType: string | null;
    sortOrder: number;
  }[];
};

export function formatPostListItem(post: PostWithImages) {
  const sortedImages = [...post.images].sort((a, b) => a.sortOrder - b.sortOrder);

  return {
    id: post.id,
    topic: post.topic,
    topicType: post.topic,
    style: post.style,
    styleType: post.style,
    dayCount: post.dayCount,
    title: post.title,
    contentPreview: makePreview(post.content),
    preview: makePreview(post.content),
    coverText: post.coverText,
    coverImage: sortedImages[0]?.url ?? null,
    tags: normalizeTags(post.tags),
    date: formatDate(post.checkinDate),
    time: formatTime(post.checkinDate),
    createdAt: post.createdAt.toISOString(),
    checkinDate: post.checkinDate.toISOString(),
  };
}

export function formatPostDetail(post: PostWithImages) {
  return {
    id: post.id,
    topic: post.topic,
    dayCount: post.dayCount,
    style: post.style,
    inputText: post.inputText,
    images: [...post.images]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((image) => ({
        id: image.id,
        url: image.url,
        width: image.width,
        height: image.height,
        size: image.size,
        mimeType: image.mimeType,
      })),
    analysis: post.analysisJson,
    title: post.title,
    content: post.content,
    tags: normalizeTags(post.tags),
    coverText: post.coverText,
    provider: post.provider,
    model: post.model,
    createdAt: post.createdAt.toISOString(),
    checkinDate: post.checkinDate.toISOString(),
  };
}

export function normalizeTags(value: Prisma.JsonValue): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === 'string');
}

function makePreview(content: string) {
  const normalized = content.replace(/\s+/g, ' ').trim();
  return normalized.length > 80 ? `${normalized.slice(0, 80)}...` : normalized;
}

function formatDate(date: Date) {
  return formatDateTz(date);
}

function formatTime(date: Date) {
  return formatTimeTz(date);
}
