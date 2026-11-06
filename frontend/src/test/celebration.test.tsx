import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { App } from '../App';
import * as api from '../services/api';
import { Contest } from '../types/contest';
import {
  triggerClapShower,
  hasCelebratedContest,
  markContestCelebrated,
  clearCelebratedContests,
} from '../utils/celebration';
import * as soundModule from '../utils/sound';

vi.mock('../services/api', () => ({
  fetchContests: vi.fn(),
  fetchNextContest: vi.fn(),
  fetchPlatformStatuses: vi.fn(),
  triggerAdminRefresh: vi.fn(),
  recordStudentVisit: vi.fn(),
  fetchAnalyticsStats: vi.fn(),
}));

describe('Clapping Emoji Shower Celebration & Sound', () => {
  const now = new Date();

  const mockContests: Contest[] = [
    {
      id: 'cf_round_100',
      platform: 'codeforces',
      external_id: '100',
      name: 'Codeforces Round 100',
      start_time: new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString(),
      end_time: new Date(now.getTime() + 4 * 60 * 60 * 1000).toISOString(),
      duration_seconds: 7200,
      contest_url: 'https://codeforces.com/contest/100',
      status: 'upcoming',
      created_at: '2026-11-01T00:00:00Z',
      updated_at: '2026-11-01T00:00:00Z',
    },
    {
      id: 'lc_weekly_400',
      platform: 'leetcode',
      external_id: '400',
      name: 'LeetCode Weekly Contest 400',
      start_time: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
      end_time: new Date(now.getTime() + 26 * 60 * 60 * 1000).toISOString(),
      duration_seconds: 7200,
      contest_url: 'https://leetcode.com/contest/400',
      status: 'upcoming',
      created_at: '2026-11-01T00:00:00Z',
      updated_at: '2026-11-01T00:00:00Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    document.body.innerHTML = '';

    vi.mocked(api.fetchContests).mockResolvedValue({
      items: mockContests,
      total: mockContests.length,
      limit: 150,
      offset: 0,
    });
    vi.mocked(api.fetchNextContest).mockResolvedValue(mockContests[0]);
    vi.mocked(api.fetchPlatformStatuses).mockResolvedValue([]);
    vi.mocked(api.recordStudentVisit).mockResolvedValue({
      total_visits: 120,
      active_this_month: 10,
      active_past_30_days: 15,
      active_past_7_days: 8,
      today_visits: 5,
      today_unique_students: 4,
      current_month_name: 'November 2026',
      monthly_history: [],
      visitor_id: 'test_student',
    });
    vi.mocked(api.fetchAnalyticsStats).mockResolvedValue({
      total_visits: 120,
      active_this_month: 10,
      active_past_30_days: 15,
      active_past_7_days: 8,
      today_visits: 5,
      today_unique_students: 4,
      current_month_name: 'November 2026',
      monthly_history: [],
      visitor_id: 'test_student',
    });
  });

  afterEach(() => {
    // Cleanup any lingering celebration overlays
    const overlay = document.getElementById('celebration-overlay');
    if (overlay) overlay.remove();
    const toast = document.getElementById('celebration-reduced-toast');
    if (toast) toast.remove();
  });

  it('triggerClapShower() creates a full-viewport overlay with 40-60 emoji particles and center card', () => {
    const playSpy = vi.spyOn(soundModule, 'playClappingSound');

    triggerClapShower({
      contestId: 'cf_round_100',
      contestName: 'Codeforces Round 100',
      message: 'Contest completed! 👏',
    });

    const overlay = document.getElementById('celebration-overlay');
    expect(overlay).toBeInTheDocument();
    expect(overlay).toHaveClass('celebration-overlay');

    // Emoji particles between 40 and 60
    const particles = overlay!.querySelectorAll('.celebration-emoji-particle');
    expect(particles.length).toBeGreaterThanOrEqual(40);
    expect(particles.length).toBeLessThanOrEqual(60);

    // Mostly 👏 emojis present
    const particleTexts = Array.from(particles).map((p) => p.textContent);
    const clapCount = particleTexts.filter((t) => t === '👏').length;
    expect(clapCount).toBeGreaterThan(particles.length * 0.4);

    // Center card with message and contest title
    const centerCard = overlay!.querySelector('[data-testid="celebration-center-card"]');
    expect(centerCard).toBeInTheDocument();
    expect(centerCard).toHaveTextContent('Contest completed! 👏');
    expect(centerCard).toHaveTextContent('Codeforces Round 100');

    // Soft audio playback was requested
    expect(playSpy).toHaveBeenCalled();
  });

  it('respects prefers-reduced-motion by skipping the shower/sound and displaying a gentle toast', () => {
    const playSpy = vi.spyOn(soundModule, 'playClappingSound');

    // Mock matchMedia for prefers-reduced-motion
    const originalMatchMedia = window.matchMedia;
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query.includes('prefers-reduced-motion: reduce'),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    triggerClapShower({
      contestId: 'cf_round_100',
      message: 'Contest completed! 👏',
    });

    // No heavy overlay or particles
    expect(document.getElementById('celebration-overlay')).toBeNull();
    // No sound
    expect(playSpy).not.toHaveBeenCalled();

    // Gentle reduced-motion toast is shown
    const toast = document.getElementById('celebration-reduced-toast');
    expect(toast).toBeInTheDocument();
    expect(toast).toHaveTextContent('Contest completed! 👏');

    // Restore matchMedia
    window.matchMedia = originalMatchMedia;
  });

  it('triggers celebration shower when marking contest as completed in the app', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('contest-card-cf_round_100')).toBeInTheDocument();
    });

    const completeBtn = screen.getByTestId('complete-btn-cf_round_100');
    fireEvent.click(completeBtn);

    // Celebration overlay appears
    await waitFor(() => {
      const overlay = document.getElementById('celebration-overlay');
      expect(overlay).toBeInTheDocument();
      expect(overlay).toHaveTextContent('Contest completed! 👏');
      expect(overlay).toHaveTextContent('Codeforces Round 100');
    });

    // Contest is marked completed and recorded as celebrated
    expect(hasCelebratedContest('cf_round_100')).toBe(true);
  });

  it('celebrates only ONCE per contest and does NOT re-celebrate when toggled back and forth', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('contest-card-cf_round_100')).toBeInTheDocument();
    });

    // 1. Mark completed -> celebrates!
    const completeBtn = screen.getByTestId('complete-btn-cf_round_100');
    fireEvent.click(completeBtn);

    await waitFor(() => {
      expect(document.getElementById('celebration-overlay')).toBeInTheDocument();
    });

    // Remove overlay manually to simulate timer completion
    document.getElementById('celebration-overlay')?.remove();
    expect(document.getElementById('celebration-overlay')).toBeNull();

    // Switch to Completed tab to access the completed contest
    const statusGroup = screen.getByRole('group', { name: /status selection/i });
    const completedTab = within(statusGroup).getByRole('button', { name: /Completed/i });
    fireEvent.click(completedTab);

    // 2. Unmark contest (Completed -> Mark completed) -> NO celebration
    const unmarkBtn = await screen.findByTestId('complete-btn-cf_round_100');
    fireEvent.click(unmarkBtn);
    expect(document.getElementById('celebration-overlay')).toBeNull();

    // Switch back to Upcoming tab
    const upcomingTab = within(statusGroup).getByRole('button', { name: /^Upcoming$/i });
    fireEvent.click(upcomingTab);

    // 3. Mark completed a second time -> MUST NOT celebrate again!
    const remarkBtn = await screen.findByTestId('complete-btn-cf_round_100');
    fireEvent.click(remarkBtn);

    // No celebration overlay spawned on second completion!
    expect(document.getElementById('celebration-overlay')).toBeNull();
  });

  it('allows muting and unmuting celebration audio via the header toggle button', async () => {
    render(<App />);

    const soundBtn = await screen.findByTestId('sound-toggle-btn');
    expect(soundBtn).toBeInTheDocument();
    expect(soundBtn).toHaveAttribute('aria-label', 'Mute celebration sound');

    // Click mute
    fireEvent.click(soundBtn);
    expect(soundBtn).toHaveAttribute('aria-label', 'Unmute celebration sound');
    expect(localStorage.getItem(soundModule.MUTE_STORAGE_KEY)).toBe('true');

    // Click unmute
    fireEvent.click(soundBtn);
    expect(soundBtn).toHaveAttribute('aria-label', 'Mute celebration sound');
    expect(localStorage.getItem(soundModule.MUTE_STORAGE_KEY)).toBe('false');
  });

  it('clears celebrated history when resetting all completions', () => {
    markContestCelebrated('contest_abc');
    expect(hasCelebratedContest('contest_abc')).toBe(true);

    clearCelebratedContests();
    expect(hasCelebratedContest('contest_abc')).toBe(false);
  });
});
