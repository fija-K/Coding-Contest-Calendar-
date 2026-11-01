import { render, screen, fireEvent } from '@testing-library/react';
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  useCompletedContests,
  COMPLETED_STORAGE_KEY,
  loadCompletedFromStorage,
} from '../hooks/useCompletedContests';
import { Contest } from '../types/contest';
import { ContestCard } from '../components/ContestCard';
import { ContestCalendar } from '../components/ContestCalendar';

describe('Completion Logic & useCompletedContests Hook', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('initializes with an empty set when localStorage is empty', () => {
    const { result } = renderHook(() => useCompletedContests());
    expect(result.current.completedIds.size).toBe(0);
    expect(result.current.isCompleted('contest-1')).toBe(false);
  });

  it('marks and unmarks a contest, toggling its completion status', () => {
    const { result } = renderHook(() => useCompletedContests());

    // Mark completed
    act(() => {
      result.current.markCompleted('contest-1');
    });
    expect(result.current.isCompleted('contest-1')).toBe(true);
    expect(result.current.completedIds.size).toBe(1);

    // Unmark
    act(() => {
      result.current.unmarkCompleted('contest-1');
    });
    expect(result.current.isCompleted('contest-1')).toBe(false);
    expect(result.current.completedIds.size).toBe(0);

    // Toggle
    act(() => {
      result.current.toggleComplete('contest-2');
    });
    expect(result.current.isCompleted('contest-2')).toBe(true);

    act(() => {
      result.current.toggleComplete('contest-2');
    });
    expect(result.current.isCompleted('contest-2')).toBe(false);
  });

  it('persists completion state to localStorage across reloads', () => {
    const { result, unmount } = renderHook(() => useCompletedContests());

    act(() => {
      result.current.markCompleted('cf_1001');
      result.current.markCompleted('lc_2002');
    });

    const storedRaw = localStorage.getItem(COMPLETED_STORAGE_KEY);
    expect(storedRaw).toBeTruthy();
    const parsed = JSON.parse(storedRaw!);
    expect(parsed).toEqual(expect.arrayContaining(['cf_1001', 'lc_2002']));

    // Simulate page reload by unmounting and rendering hook again
    unmount();
    const { result: reloadedResult } = renderHook(() => useCompletedContests());
    expect(reloadedResult.current.isCompleted('cf_1001')).toBe(true);
    expect(reloadedResult.current.isCompleted('lc_2002')).toBe(true);
    expect(reloadedResult.current.isCompleted('gfg_999')).toBe(false);
  });

  it('gracefully handles missing, corrupted, or non-array localStorage data', () => {
    // 1. Malformed JSON
    localStorage.setItem(COMPLETED_STORAGE_KEY, '{invalid json');
    expect(loadCompletedFromStorage().size).toBe(0);

    // 2. Non-array JSON (e.g. number or object)
    localStorage.setItem(COMPLETED_STORAGE_KEY, JSON.stringify({ count: 5 }));
    expect(loadCompletedFromStorage().size).toBe(0);

    // 3. Array with invalid types
    localStorage.setItem(COMPLETED_STORAGE_KEY, JSON.stringify([123, null, '', 'valid_id']));
    const set = loadCompletedFromStorage();
    expect(set.size).toBe(1);
    expect(set.has('valid_id')).toBe(true);

    // 4. Hook works cleanly with corrupted initial storage
    localStorage.setItem(COMPLETED_STORAGE_KEY, 'corrupted');
    const { result } = renderHook(() => useCompletedContests());
    expect(result.current.completedIds.size).toBe(0);
  });
});

describe('Completion Synchronization Between Views & Components', () => {
  const mockContestA: Contest = {
    id: 'cf_100',
    platform: 'codeforces',
    external_id: '100',
    name: 'Codeforces Round 100',
    start_time: '2026-11-10T14:00:00Z',
    end_time: '2026-11-10T16:00:00Z',
    duration_seconds: 7200,
    contest_url: 'https://codeforces.com/contest/100',
    status: 'upcoming',
    created_at: '2026-11-01T00:00:00Z',
    updated_at: '2026-11-01T00:00:00Z',
  };

  const mockContestB: Contest = {
    id: 'lc_200',
    platform: 'leetcode',
    external_id: '200',
    name: 'LeetCode Weekly Contest 200',
    start_time: '2026-11-11T14:00:00Z',
    end_time: '2026-11-11T15:30:00Z',
    duration_seconds: 5400,
    contest_url: 'https://leetcode.com/contest/200',
    status: 'upcoming',
    created_at: '2026-11-01T00:00:00Z',
    updated_at: '2026-11-01T00:00:00Z',
  };

  it('synchronizes completion state between List Card and Calendar Chip', () => {
    let completedSet = new Set<string>();
    const onToggle = vi.fn((id: string) => {
      if (completedSet.has(id)) {
        completedSet.delete(id);
      } else {
        completedSet.add(id);
      }
    });

    // 1. Initial uncompleted in list view
    const { rerender } = render(
      <ContestCard
        contest={mockContestA}
        timezone="UTC"
        isCompleted={completedSet.has(mockContestA.id)}
        onToggleComplete={onToggle}
      />
    );
    expect(screen.getByRole('button', { name: /^Mark completed$/i })).toBeInTheDocument();

    // 2. Mark completed in List view
    fireEvent.click(screen.getByRole('button', { name: /^Mark completed$/i }));
    expect(onToggle).toHaveBeenCalledWith('cf_100');
    completedSet.add('cf_100');

    // 3. Render Calendar view with synchronized completion state
    rerender(
      <ContestCalendar
        contests={[mockContestA]}
        timezone="UTC"
        isCompleted={(id) => completedSet.has(id)}
        onToggleComplete={onToggle}
      />
    );

    const calendarToggle = screen.getByTestId(`calendar-toggle-${mockContestA.id}`);
    expect(calendarToggle).toHaveClass('completed');
    expect(calendarToggle).toHaveAttribute('aria-label', expect.stringContaining('Completed'));

    // 4. Toggle back from calendar view
    fireEvent.click(calendarToggle);
    expect(onToggle).toHaveBeenCalledWith('cf_100');
  });

  it('calculates the completion counter correctly based on unique contests', () => {
    const list = [mockContestA, mockContestB, mockContestA]; // Note: mockContestA is duplicated
    const uniqueIds = new Set(list.map((c) => c.id));
    expect(uniqueIds.size).toBe(2);

    const completed = new Set(['cf_100']);
    const completedCount = Array.from(uniqueIds).filter((id) => completed.has(id)).length;
    expect(completedCount).toBe(1);

    const counterText = `Completed: ${completedCount} of ${uniqueIds.size} contests`;
    expect(counterText).toBe('Completed: 1 of 2 contests');
  });
});
