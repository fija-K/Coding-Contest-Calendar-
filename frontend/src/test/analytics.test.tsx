import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { App } from '../App';
import * as api from '../services/api';
import { AnalyticsData, Contest } from '../types/contest';

vi.mock('../services/api', () => ({
  fetchContests: vi.fn(),
  fetchNextContest: vi.fn(),
  fetchPlatformStatuses: vi.fn(),
  triggerAdminRefresh: vi.fn(),
  recordStudentVisit: vi.fn(),
  fetchAnalyticsStats: vi.fn(),
}));

describe('Total Visits Counter (Hover-only) & Recently Finished 7-Day Auto-Removal', () => {
  const mockAnalytics: AnalyticsData = {
    total_visits: 1420,
    active_this_month: 85,
    active_past_30_days: 90,
    active_past_7_days: 44,
    today_visits: 23,
    today_unique_students: 18,
    current_month_name: 'November 2026',
    monthly_history: [
      {
        month: '2026-11',
        month_name: 'Nov 2026',
        unique_students: 85,
        total_visits: 620,
      },
    ],
    visitor_id: 'stu_unit_test',
  };

  const now = new Date();

  const mockContests: Contest[] = [
    {
      id: 'cf_live',
      platform: 'codeforces',
      external_id: '1',
      name: 'Codeforces Live Round',
      start_time: new Date(now.getTime() - 30 * 60 * 1000).toISOString(),
      end_time: new Date(now.getTime() + 90 * 60 * 1000).toISOString(),
      duration_seconds: 7200,
      contest_url: 'https://codeforces.com/contest/1',
      status: 'ongoing',
      created_at: '2026-11-01T00:00:00Z',
      updated_at: '2026-11-01T00:00:00Z',
    },
    {
      id: 'lc_upcoming',
      platform: 'leetcode',
      external_id: '527',
      name: 'LeetCode Weekly Contest 527',
      start_time: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
      end_time: new Date(now.getTime() + 26 * 60 * 60 * 1000).toISOString(),
      duration_seconds: 7200,
      contest_url: 'https://leetcode.com/contest/527',
      status: 'upcoming',
      created_at: '2026-11-01T00:00:00Z',
      updated_at: '2026-11-01T00:00:00Z',
    },
    {
      id: 'cc_recent',
      platform: 'codechef',
      external_id: 'START264',
      name: 'CodeChef Starters 264',
      start_time: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000 - 7200 * 1000).toISOString(),
      end_time: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      duration_seconds: 7200,
      contest_url: 'https://codechef.com/START264',
      status: 'completed',
      created_at: '2026-11-01T00:00:00Z',
      updated_at: '2026-11-01T00:00:00Z',
    },
    {
      id: 'cf_old_expired',
      platform: 'codeforces',
      external_id: '190',
      name: 'Codeforces Old Round 190',
      start_time: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000 - 7200 * 1000).toISOString(),
      end_time: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      duration_seconds: 7200,
      contest_url: 'https://codeforces.com/contest/190',
      status: 'completed',
      created_at: '2026-11-01T00:00:00Z',
      updated_at: '2026-11-01T00:00:00Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.mocked(api.fetchContests).mockResolvedValue({
      items: mockContests,
      total: mockContests.length,
      limit: 150,
      offset: 0,
    });
    vi.mocked(api.fetchNextContest).mockResolvedValue(mockContests[1]);
    vi.mocked(api.fetchPlatformStatuses).mockResolvedValue([]);
    vi.mocked(api.recordStudentVisit).mockResolvedValue(mockAnalytics);
    vi.mocked(api.fetchAnalyticsStats).mockResolvedValue(mockAnalytics);
  });

  it('displays the total website visits pill in the header with hover tooltip and NO popup modal', async () => {
    render(<App />);

    await waitFor(() => {
      const visitPill = screen.getByTestId('header-visit-counter');
      expect(visitPill).toBeInTheDocument();
      expect(visitPill).toHaveTextContent('1,420 visits');
      expect(visitPill).toHaveTextContent('1,420 total website visits');
    });

    // Clicking the pill must NOT trigger any popup modal dialog
    const visitPill = screen.getByTestId('header-visit-counter');
    fireEvent.click(visitPill);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('automatically removes finished contests older than 7 days, keeping recent ones in Recently Finished', async () => {
    render(<App />);

    await waitFor(() => {
      // Live and upcoming contests are displayed
      expect(screen.getByTestId('contest-card-cf_live')).toBeInTheDocument();
      expect(screen.getByTestId('contest-card-lc_upcoming')).toBeInTheDocument();

      // Recent contest (ended 2 days ago) is displayed
      expect(screen.getByTestId('contest-card-cc_recent')).toBeInTheDocument();

      // OLD contest (ended 10 days ago, >7 days auto-removal) is AUTOMATICALLY REMOVED
      expect(screen.queryByTestId('contest-card-cf_old_expired')).not.toBeInTheDocument();
    });

    // Recently Finished section header is rendered for recent ended contests
    expect(screen.getByTestId('recently-finished-section')).toBeInTheDocument();

    // Auto-remove countdown pill displays remaining days (e.g. 5d)
    const autoRemoveBadge = screen.getByTestId('auto-remove-cc_recent');
    expect(autoRemoveBadge).toHaveTextContent(/Auto-removes in 5d/i);
  });

  it('allows filtering by Recently Finished tab and moving finished contests to Completed upon marking complete', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('contest-card-cc_recent')).toBeInTheDocument();
    });

    // Status filter control has Recently Finished tab with count (1)
    const recentTab = screen.getByRole('button', { name: /Recently Finished/i });
    expect(recentTab).toHaveTextContent('Recently Finished(1)');

    // Click Recently Finished tab
    fireEvent.click(recentTab);

    // Only the recent contest is shown; live and upcoming are hidden
    await waitFor(() => {
      expect(screen.getByTestId('contest-card-cc_recent')).toBeInTheDocument();
      expect(screen.queryByTestId('contest-card-cf_live')).not.toBeInTheDocument();
      expect(screen.queryByTestId('contest-card-lc_upcoming')).not.toBeInTheDocument();
    });

    // Click "Mark completed" on the recently finished contest
    const completeBtn = screen.getByTestId('complete-btn-cc_recent');
    fireEvent.click(completeBtn);

    // Now it disappears from Recently Finished view (since it is completed!)
    await waitFor(() => {
      expect(screen.queryByTestId('contest-card-cc_recent')).not.toBeInTheDocument();
    });

    // Switch to Completed tab
    const completedTab = screen.getByRole('button', { name: /Completed/i });
    fireEvent.click(completedTab);

    // It is preserved in the Completed tab!
    await waitFor(() => {
      expect(screen.getByTestId('contest-card-cc_recent')).toBeInTheDocument();
      expect(screen.getByTestId('completed-badge')).toHaveTextContent(/Completed/i);
    });
  });
});
