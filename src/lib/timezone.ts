/**
 * Centralised timezone utilities.
 *
 * The application stores all timestamps in UTC (via Prisma / MySQL).
 * When formatting dates for display or grouping records by calendar day,
 * we need to convert from UTC to the user-facing timezone.
 *
 * For MVP the target audience is mainland-China Xiaohongshu users, so
 * we default to Asia/Shanghai (UTC+8, no DST).
 */

export const APP_TIMEZONE = 'Asia/Shanghai';

// ── Display formatting ─────────────────────────────────────────────────────

/**
 * Format a `Date` as `YYYY-MM-DD` in {@link APP_TIMEZONE}.
 *
 * Example: a UTC date `2026-07-11T13:35:00Z` → `"2026-07-11"` (Shanghai 21:35)
 */
export function formatDateTz(date: Date, tz: string = APP_TIMEZONE): string {
  // en-CA locale produces YYYY-MM-DD by default
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/**
 * Format a `Date` as `HH:mm` (24-hour) in {@link APP_TIMEZONE}.
 *
 * Example: a UTC date `2026-07-11T13:35:00Z` → `"21:35"` (Shanghai)
 */
export function formatTimeTz(date: Date, tz: string = APP_TIMEZONE): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

// ── Calendar / query helpers ───────────────────────────────────────────────

/**
 * Return the UTC `Date` that corresponds to `00:00:00` on the given
 * calendar day in {@link APP_TIMEZONE}.
 *
 * Asia/Shanghai is a fixed UTC+8 offset (no DST), so we can safely
 * construct the instant via an ISO-8601 string with `+08:00`.
 */
export function midnightInTz(
  year: number,
  month: number,
  day: number = 1,
): Date {
  const pad = (n: number) => String(n).padStart(2, '0');
  return new Date(`${year}-${pad(month)}-${pad(day)}T00:00:00+08:00`);
}
