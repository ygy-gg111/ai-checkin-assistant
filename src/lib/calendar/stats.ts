export interface CalendarSummaryStats {
  monthlyCheckins: number;
  monthlyGenerated: number;
  currentStreak: number;
  longestStreak: number;
}

import {formatDateTz} from '@/lib/timezone';

export function toDateKey(date: Date) {
  return formatDateTz(date);
}


export function calculateStreakStats(dateKeys: string[]) {
  if (dateKeys.length === 0) {
    return {
      currentStreak: 0,
      longestStreak: 0,
    };
  }

  const uniqueSortedDates = Array.from(new Set(dateKeys)).sort();
  let longestStreak = 1;
  let runningStreak = 1;

  for (let i = 1; i < uniqueSortedDates.length; i++) {
    const previous = parseDateKey(uniqueSortedDates[i - 1]);
    const current = parseDateKey(uniqueSortedDates[i]);
    const diffDays = Math.round((current.getTime() - previous.getTime()) / 86400000);

    if (diffDays === 1) {
      runningStreak += 1;
      longestStreak = Math.max(longestStreak, runningStreak);
    } else {
      runningStreak = 1;
    }
  }

  let currentStreak = 1;
  for (let i = uniqueSortedDates.length - 1; i > 0; i--) {
    const previous = parseDateKey(uniqueSortedDates[i - 1]);
    const current = parseDateKey(uniqueSortedDates[i]);
    const diffDays = Math.round((current.getTime() - previous.getTime()) / 86400000);

    if (diffDays === 1) {
      currentStreak += 1;
    } else {
      break;
    }
  }

  return {
    currentStreak,
    longestStreak,
  };
}

function parseDateKey(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}
