import { describe, it, expect } from 'vitest';
import { formatDateTime, formatDuration, calculateCountdown, getContestLiveStatus } from '../utils/date';

describe('Date and Countdown Utilities', () => {
  it('formats datetime correctly in Asia/Kolkata timezone', () => {
    // 2026-11-04T14:30:00Z -> In IST (UTC+05:30) is 20:00 (8:00 PM)
    const utcIso = '2026-11-04T14:30:00Z';
    const formatted = formatDateTime(utcIso, 'Asia/Kolkata');
    expect(formatted).toContain('Nov 4, 2026');
    expect(formatted).toContain('8:00 PM');
  });

  it('formats datetime correctly in UTC timezone', () => {
    const utcIso = '2026-11-04T14:30:00Z';
    const formatted = formatDateTime(utcIso, 'UTC');
    expect(formatted).toContain('Nov 4, 2026');
    expect(formatted).toContain('2:30 PM');
  });

  it('formats duration in seconds to hours and minutes', () => {
    expect(formatDuration(7200)).toBe('2h');
    expect(formatDuration(5400)).toBe('1h 30m');
    expect(formatDuration(1800)).toBe('30m');
    expect(formatDuration(0)).toBe('0m');
  });

  it('calculates countdown accurately for upcoming contest', () => {
    const fakeNow = new Date('2026-11-01T12:00:00Z');
    const startIso = '2026-11-01T14:30:00Z'; // 2 hours 30 mins later
    const endIso = '2026-11-01T16:30:00Z';

    const countdown = calculateCountdown(startIso, endIso, fakeNow);
    expect(countdown.isUpcoming).toBe(true);
    expect(countdown.isOngoing).toBe(false);
    expect(countdown.isCompleted).toBe(false);
    expect(countdown.hours).toBe(2);
    expect(countdown.minutes).toBe(30);
    expect(countdown.seconds).toBe(0);
    expect(countdown.formatted).toBe('Starts in 02h 30m 00s');
  });

  it('calculates countdown accurately for ongoing contest', () => {
    const fakeNow = new Date('2026-11-01T15:00:00Z');
    const startIso = '2026-11-01T14:00:00Z';
    const endIso = '2026-11-01T16:00:00Z'; // 1 hour left

    const countdown = calculateCountdown(startIso, endIso, fakeNow);
    expect(countdown.isUpcoming).toBe(false);
    expect(countdown.isOngoing).toBe(true);
    expect(countdown.isCompleted).toBe(false);
    expect(countdown.hours).toBe(1);
    expect(countdown.minutes).toBe(0);
    expect(countdown.formatted).toBe('Ends in 01h 00m 00s');
  });

  it('handles completed contest without negative values', () => {
    const fakeNow = new Date('2026-11-01T17:00:00Z');
    const startIso = '2026-11-01T14:00:00Z';
    const endIso = '2026-11-01T16:00:00Z';

    const countdown = calculateCountdown(startIso, endIso, fakeNow);
    expect(countdown.isCompleted).toBe(true);
    expect(countdown.formatted).toBe('Contest completed');
  });

  it('correctly classifies contest as upcoming, live, or expired', () => {
    const startIso = '2026-11-04T14:30:00Z';
    const endIso = '2026-11-04T16:30:00Z';

    // Before start -> upcoming
    const beforeStart = new Date('2026-11-04T14:00:00Z');
    expect(getContestLiveStatus(startIso, endIso, beforeStart)).toBe('upcoming');

    // During contest -> live
    const duringContest = new Date('2026-11-04T15:00:00Z');
    expect(getContestLiveStatus(startIso, endIso, duringContest)).toBe('live');

    // After end -> expired
    const afterEnd = new Date('2026-11-04T17:00:00Z');
    expect(getContestLiveStatus(startIso, endIso, afterEnd)).toBe('expired');
  });
});
