import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { App } from '../App';
import * as api from '../services/api';
import { Contest } from '../types/contest';
import { COMPLETED_STORAGE_KEY } from '../hooks/useCompletedContests';

vi.mock('../services/api', () => ({
  fetchContests: vi.fn(),
  fetchNextContest: vi.fn(),
  fetchPlatformStatuses: vi.fn(),
  triggerAdminRefresh: vi.fn(),
}));

describe('App End-to-End Completion Integration', () => {
  const mockContests: Contest[] = [
    {
      id: 'cf_101',
      platform: 'codeforces',
      external_id: '101',
      name: 'Codeforces Round 101',
      start_time: '2026-11-10T14:00:00Z',
      end_time: '2026-11-10T16:00:00Z',
      duration_seconds: 7200,
      contest_url: 'https://codeforces.com/contest/101',
      status: 'upcoming',
      created_at: '2026-11-01T00:00:00Z',
      updated_at: '2026-11-01T00:00:00Z',
    },
    {
      id: 'lc_202',
      platform: 'leetcode',
      external_id: '202',
      name: 'LeetCode Weekly Contest 202',
      start_time: '2026-11-12T14:00:00Z',
      end_time: '2026-11-12T15:30:00Z',
      duration_seconds: 5400,
      contest_url: 'https://leetcode.com/contest/202',
      status: 'upcoming',
      created_at: '2026-11-01T00:00:00Z',
      updated_at: '2026-11-01T00:00:00Z',
    },
  ];

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();

    vi.mocked(api.fetchContests).mockResolvedValue({
      items: mockContests,
      total: mockContests.length,
      limit: 150,
      offset: 0,
    });
    vi.mocked(api.fetchNextContest).mockResolvedValue(mockContests[0]);
    vi.mocked(api.fetchPlatformStatuses).mockResolvedValue([
      {
        platform: 'codeforces',
        name: 'Codeforces',
        health: 'healthy',
        last_successful_refresh: '2026-11-01T00:00:00Z',
        last_attempted_refresh: '2026-11-01T00:00:00Z',
        latest_error: null,
        contest_count: 1,
        is_stale: false,
      },
      {
        platform: 'leetcode',
        name: 'LeetCode',
        health: 'healthy',
        last_successful_refresh: '2026-11-01T00:00:00Z',
        last_attempted_refresh: '2026-11-01T00:00:00Z',
        latest_error: null,
        contest_count: 1,
        is_stale: false,
      },
    ]);
  });

  it('marks a contest completed, removes it from Upcoming view, updates counter, and shows in Completed view', async () => {
    render(<App />);

    // Wait for contest cards to load
    await waitFor(() => {
      expect(screen.getByTestId('contest-card-cf_101')).toBeInTheDocument();
      expect(screen.getByTestId('contest-card-lc_202')).toBeInTheDocument();
    });

    // Check initial counter: Completed: 0 of 2 contests
    expect(screen.getByTestId('completion-counter')).toHaveTextContent('Completed: 0 of 2 contests');

    // Click "Mark completed" on Codeforces Round 101
    const markBtn = screen.getByTestId('complete-btn-cf_101');
    expect(markBtn).toHaveTextContent(/Mark completed/i);
    fireEvent.click(markBtn);

    // After marking completed in Upcoming view:
    // Codeforces Round 101 card should vanish from Upcoming list
    await waitFor(() => {
      expect(screen.queryByTestId('contest-card-cf_101')).not.toBeInTheDocument();
      expect(screen.getByTestId('contest-card-lc_202')).toBeInTheDocument();
    });

    // Hero also advances to next uncompleted contest (LeetCode Weekly Contest 202)
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('LeetCode Weekly Contest 202');

    // Completion counter updates to: Completed: 1 of 2 contests
    expect(screen.getByTestId('completion-counter')).toHaveTextContent('Completed: 1 of 2 contests');

    // Check localStorage persistence
    const saved = JSON.parse(localStorage.getItem(COMPLETED_STORAGE_KEY) || '[]');
    expect(saved).toContain('cf_101');

    // Switch to "Completed" filter via status group
    const statusGroup = screen.getByRole('group', { name: /status selection/i });
    const completedTab = within(statusGroup).getByRole('button', { name: /Completed/i });
    fireEvent.click(completedTab);

    // In Completed view: Codeforces Round 101 card should be displayed, LeetCode Weekly Contest 202 should NOT
    await waitFor(() => {
      expect(screen.getByTestId('contest-card-cf_101')).toBeInTheDocument();
      expect(screen.queryByTestId('contest-card-lc_202')).not.toBeInTheDocument();
    });

    // Unmark Codeforces Round 101 from Completed view
    const unmarkBtn = screen.getByTestId('complete-btn-cf_101');
    expect(unmarkBtn).toHaveTextContent(/^Completed$/i);
    fireEvent.click(unmarkBtn);

    // After unmarking, it disappears from Completed view
    await waitFor(() => {
      expect(screen.queryByTestId('contest-card-cf_101')).not.toBeInTheDocument();
    });

    // Counter resets to: Completed: 0 of 2 contests
    expect(screen.getByTestId('completion-counter')).toHaveTextContent('Completed: 0 of 2 contests');

    // Switch back to "Upcoming" filter: Codeforces Round 101 is restored!
    const upcomingTab = within(statusGroup).getByRole('button', { name: /^Upcoming$/i });
    fireEvent.click(upcomingTab);

    await waitFor(() => {
      expect(screen.getByTestId('contest-card-cf_101')).toBeInTheDocument();
      expect(screen.getByTestId('contest-card-lc_202')).toBeInTheDocument();
    });
  });

  it('restores completion records after page reload from localStorage', async () => {
    // Seed localStorage before mounting
    localStorage.setItem(COMPLETED_STORAGE_KEY, JSON.stringify(['lc_202']));

    render(<App />);

    // In default "Upcoming" view, lc_202 card should be filtered out, cf_101 card should be present
    await waitFor(() => {
      expect(screen.getByTestId('contest-card-cf_101')).toBeInTheDocument();
      expect(screen.queryByTestId('contest-card-lc_202')).not.toBeInTheDocument();
    });

    // Counter reflects 1 completed
    expect(screen.getByTestId('completion-counter')).toHaveTextContent('Completed: 1 of 2 contests');

    // Switch to "All" view: both are visible, and lc_202 is marked completed
    const statusGroup = screen.getByRole('group', { name: /status selection/i });
    const allTab = within(statusGroup).getByRole('button', { name: /^All$/i });
    fireEvent.click(allTab);

    await waitFor(() => {
      expect(screen.getByTestId('contest-card-cf_101')).toBeInTheDocument();
      expect(screen.getByTestId('contest-card-lc_202')).toBeInTheDocument();
    });

    const lcBtn = screen.getByTestId('complete-btn-lc_202');
    expect(lcBtn).toHaveTextContent(/^Completed$/i);

    const cfBtn = screen.getByTestId('complete-btn-cf_101');
    expect(cfBtn).toHaveTextContent(/^Mark completed$/i);
  });
});
