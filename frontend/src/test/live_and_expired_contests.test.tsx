import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { App } from '../App';
import * as api from '../services/api';
import { Contest } from '../types/contest';

vi.mock('../services/api', () => ({
  fetchContests: vi.fn(),
  fetchNextContest: vi.fn(),
  fetchPlatformStatuses: vi.fn(),
  triggerAdminRefresh: vi.fn(),
}));

describe('Live and Expired Contests Behavior', () => {
  // Scenario matching user environment:
  // Current time: 2026-11-04 16:55:00 UTC (10:25 PM IST)
  // 1. Weekly Contest 526: Nov 1, 02:30 UTC -> EXPIRED (not marked completed)
  // 2. Starters 263: Nov 4, 14:30 - 16:30 UTC -> EXPIRED (will be marked completed)
  // 3. Ongoing Contest: Nov 4, 16:00 - 17:30 UTC -> LIVE NOW!
  // 4. Future Contest (Div. 2): Nov 6, 14:35 UTC -> UP NEXT!
  const mockContests: Contest[] = [
    {
      id: 'lc_526',
      platform: 'leetcode',
      external_id: '526',
      name: 'Weekly Contest 526',
      start_time: '2026-11-01T02:30:00Z',
      end_time: '2026-11-01T04:00:00Z',
      duration_seconds: 5400,
      contest_url: 'https://leetcode.com/contest/526',
      status: 'completed',
      created_at: '2026-11-01T00:00:00Z',
      updated_at: '2026-11-01T00:00:00Z',
    },
    {
      id: 'cc_starters_263',
      platform: 'codechef',
      external_id: 'starters_263',
      name: 'Starters 263',
      start_time: '2026-11-04T14:30:00Z',
      end_time: '2026-11-04T16:30:00Z',
      duration_seconds: 7200,
      contest_url: 'https://www.codechef.com/START263',
      status: 'completed',
      created_at: '2026-11-01T00:00:00Z',
      updated_at: '2026-11-01T00:00:00Z',
    },
    {
      id: 'cf_live_now',
      platform: 'codeforces',
      external_id: 'live_1',
      name: 'Live Codeforces Challenge',
      start_time: '2026-11-04T16:00:00Z', // Started 55m ago
      end_time: '2026-11-04T17:30:00Z',   // Ends in 35m
      duration_seconds: 5400,
      contest_url: 'https://codeforces.com/contest/live_1',
      status: 'ongoing',
      created_at: '2026-11-01T00:00:00Z',
      updated_at: '2026-11-01T00:00:00Z',
    },
    {
      id: 'cf_round_div2',
      platform: 'codeforces',
      external_id: 'div2_upcoming',
      name: 'Codeforces Round (Div. 2)',
      start_time: '2026-11-06T14:35:00Z', // 2 days in future
      end_time: '2026-11-06T16:35:00Z',
      duration_seconds: 7200,
      contest_url: 'https://codeforces.com/contest/div2_upcoming',
      status: 'upcoming',
      created_at: '2026-11-01T00:00:00Z',
      updated_at: '2026-11-01T00:00:00Z',
    },
  ];

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    // Set system time to 2026-11-04 16:55:00 UTC (10:25 PM IST)
    vi.setSystemTime(new Date('2026-11-04T16:55:00Z'));
    localStorage.clear();
    vi.clearAllMocks();

    vi.mocked(api.fetchContests).mockResolvedValue({
      items: mockContests,
      total: mockContests.length,
      limit: 150,
      offset: 0,
    });
    // Even if backend naively returned an expired next contest:
    vi.mocked(api.fetchNextContest).mockResolvedValue(mockContests[1]); // Starters 263 (expired!)
    vi.mocked(api.fetchPlatformStatuses).mockResolvedValue([]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders LIVE contest BEFORE UP NEXT, and never shows expired contest as UP NEXT', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('hero-live-card')).toBeInTheDocument();
      expect(screen.getByTestId('hero-upnext-card')).toBeInTheDocument();
    });

    // 1. Live card appears first and has "LIVE NOW"
    const liveCard = screen.getByTestId('hero-live-card');
    expect(within(liveCard).getByText('LIVE NOW')).toBeInTheDocument();
    expect(within(liveCard).getByText('Live Codeforces Challenge')).toBeInTheDocument();
    expect(within(liveCard).getByText('ENDS IN')).toBeInTheDocument();
    expect(within(liveCard).getByRole('link', { name: /Enter live contest/i })).toHaveAttribute(
      'href',
      'https://codeforces.com/contest/live_1'
    );

    // 2. UP NEXT card appears after and has "Codeforces Round (Div. 2)" (NOT Starters 263 or Weekly 526!)
    const upNextCard = screen.getByTestId('hero-upnext-card');
    expect(within(upNextCard).getByText('UP NEXT')).toBeInTheDocument();
    expect(within(upNextCard).getByText('Codeforces Round (Div. 2)')).toBeInTheDocument();
    expect(within(upNextCard).getByText('STARTS IN')).toBeInTheDocument();
    expect(within(upNextCard).queryByText(/Contest completed/i)).not.toBeInTheDocument();

    // Verify ordering in DOM: Live card comes BEFORE Up Next card
    const heroWrapper = screen.getByTestId('hero-focal-wrapper');
    const cards = within(heroWrapper).getAllByRole('region');
    expect(cards[0]).toHaveAttribute('data-testid', 'hero-live-card');
    expect(cards[1]).toHaveAttribute('data-testid', 'hero-upnext-card');
  });

  it('keeps expired uncompleted contests visible, and moves them to Completed tab once marked completed', async () => {
    render(<App />);

    // In default "Upcoming" view:
    // Live contest, upcoming contest, AND uncompleted expired contests (Weekly 526, Starters 263) MUST be visible!
    await waitFor(() => {
      expect(screen.getByTestId('contest-card-cf_live_now')).toBeInTheDocument();
      expect(screen.getByTestId('contest-card-cf_round_div2')).toBeInTheDocument();
      expect(screen.getByTestId('contest-card-lc_526')).toBeInTheDocument();
      expect(screen.getByTestId('contest-card-cc_starters_263')).toBeInTheDocument();
    });

    // Section divider for ended contests is present
    expect(screen.getByRole('separator', { name: /Ended contests awaiting completion/i })).toBeInTheDocument();

    // Initial completed count is 0
    expect(screen.getByTestId('completion-counter')).toHaveTextContent('Completed: 0 of 4 contests');

    // Click "Mark completed" on Starters 263
    const markBtn = screen.getByTestId('complete-btn-cc_starters_263');
    fireEvent.click(markBtn);

    // Starters 263 should IMMEDIATELY vanish from Upcoming view!
    await waitFor(() => {
      expect(screen.queryByTestId('contest-card-cc_starters_263')).not.toBeInTheDocument();
    });

    // But Weekly Contest 526 (which wasn't marked completed) is STILL visible!
    expect(screen.getByTestId('contest-card-lc_526')).toBeInTheDocument();
    expect(screen.getByTestId('contest-card-cf_round_div2')).toBeInTheDocument();
    expect(screen.getByTestId('contest-card-cf_live_now')).toBeInTheDocument();

    // Completed counter shows 1 completed
    expect(screen.getByTestId('completion-counter')).toHaveTextContent('Completed: 1 of 4 contests');

    // Switch to Completed tab
    const statusGroup = screen.getByRole('group', { name: /status selection/i });
    const completedTab = within(statusGroup).getByRole('button', { name: /Completed/i });
    fireEvent.click(completedTab);

    // In Completed tab: Starters 263 is present, and other contests are NOT
    await waitFor(() => {
      expect(screen.getByTestId('contest-card-cc_starters_263')).toBeInTheDocument();
      expect(screen.queryByTestId('contest-card-lc_526')).not.toBeInTheDocument();
      expect(screen.queryByTestId('contest-card-cf_round_div2')).not.toBeInTheDocument();
    });
  });
});
