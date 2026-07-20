const MAX_POST_TITLE_LENGTH = 255;

export function formatDayTitle(dayCount: number | null | undefined, title: string) {
  const normalizedTitle = title.trim();
  if (!dayCount || dayCount < 1) {
    return normalizedTitle.slice(0, MAX_POST_TITLE_LENGTH);
  }

  const titleWithoutDayPrefix = normalizedTitle
    .replace(/^Day\s*\d+\s*(?:天)?\s*[|｜·:：\-—]?\s*/i, '')
    .replace(/^第\s*\d+\s*天\s*[|｜·:：\-—]?\s*/, '')
    .trim();
  const subject = titleWithoutDayPrefix || normalizedTitle;
  const prefix = `Day ${dayCount} 天 `;

  return `${prefix}${subject.slice(0, MAX_POST_TITLE_LENGTH - prefix.length)}`.trimEnd();
}
