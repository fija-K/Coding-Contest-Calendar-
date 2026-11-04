export interface TimezoneOption {
  value: string;
  label: string;
  offset: string;
}

export const COMMON_TIMEZONES: TimezoneOption[] = [
  { value: 'Asia/Kolkata', label: 'India Standard Time (IST)', offset: 'UTC+05:30' },
  { value: 'UTC', label: 'Coordinated Universal Time (UTC)', offset: 'UTC+00:00' },
  { value: 'America/New_York', label: 'US Eastern Time (ET)', offset: 'UTC-05:00 / -04:00' },
  { value: 'America/Los_Angeles', label: 'US Pacific Time (PT)', offset: 'UTC-08:00 / -07:00' },
  { value: 'Europe/London', label: 'London (GMT / BST)', offset: 'UTC+00:00 / +01:00' },
  { value: 'Europe/Berlin', label: 'Central European Time (CET)', offset: 'UTC+01:00 / +02:00' },
  { value: 'Asia/Tokyo', label: 'Japan Standard Time (JST)', offset: 'UTC+09:00' },
  { value: 'Asia/Singapore', label: 'Singapore Time (SGT)', offset: 'UTC+08:00' },
  { value: 'Australia/Sydney', label: 'Sydney Time (AEST)', offset: 'UTC+10:00 / +11:00' },
];

export function formatDateTime(isoString: string, timeZone: string = 'Asia/Kolkata'): string {
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return 'Invalid date';

    return new Intl.DateTimeFormat('en-US', {
      timeZone,
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(date);
  } catch {
    return isoString;
  }
}

export function formatDateOnly(isoString: string, timeZone: string = 'Asia/Kolkata'): string {
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return '';

    return new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
  } catch {
    return isoString;
  }
}

export function formatTimeOnly(isoString: string, timeZone: string = 'Asia/Kolkata'): string {
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return '';

    return new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(date);
  } catch {
    return '';
  }
}

export function formatDuration(seconds: number): string {
  if (seconds <= 0) return '0m';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);

  if (hrs > 0 && mins > 0) return `${hrs}h ${mins}m`;
  if (hrs > 0) return `${hrs}h`;
  return `${mins}m`;
}

export interface CountdownState {
  label: string;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  formatted: string;
  isUpcoming: boolean;
  isOngoing: boolean;
  isCompleted: boolean;
}

export type LiveStatus = 'live' | 'upcoming' | 'expired';

export function getContestLiveStatus(
  startTimeIso: string,
  endTimeIso?: string | null,
  now: Date = new Date(),
  durationSeconds?: number
): LiveStatus {
  const current = now.getTime();
  const start = new Date(startTimeIso).getTime();
  let end: number;
  if (endTimeIso) {
    end = new Date(endTimeIso).getTime();
  } else if (durationSeconds !== undefined) {
    end = start + durationSeconds * 1000;
  } else {
    end = start;
  }

  if (current < start) {
    return 'upcoming';
  } else if (current >= start && current <= end) {
    return 'live';
  } else {
    return 'expired';
  }
}

export function calculateCountdown(
  startTimeIso: string,
  endTimeIso: string,
  now: Date = new Date()
): CountdownState {
  const start = new Date(startTimeIso).getTime();
  const end = new Date(endTimeIso).getTime();
  const current = now.getTime();

  if (current < start) {
    // Upcoming
    const diff = Math.max(0, start - current);
    const totalSeconds = Math.floor(diff / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    let formatted = 'Starts in ';
    if (days > 0) formatted += `${days}d `;
    formatted += `${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;

    return {
      label: 'Starts in',
      days,
      hours,
      minutes,
      seconds,
      formatted,
      isUpcoming: true,
      isOngoing: false,
      isCompleted: false,
    };
  } else if (current >= start && current <= end) {
    // Ongoing
    const diff = Math.max(0, end - current);
    const totalSeconds = Math.floor(diff / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    let formatted = 'Ends in ';
    if (days > 0) formatted += `${days}d `;
    formatted += `${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;

    return {
      label: 'Ends in',
      days,
      hours,
      minutes,
      seconds,
      formatted,
      isUpcoming: false,
      isOngoing: true,
      isCompleted: false,
    };
  } else {
    // Completed
    return {
      label: 'Completed',
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      formatted: 'Contest completed',
      isUpcoming: false,
      isOngoing: false,
      isCompleted: true,
    };
  }
}
