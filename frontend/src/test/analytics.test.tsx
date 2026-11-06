import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { App } from '../App';
import * as api from '../services/api';
import { AnalyticsData } from '../types/contest';

vi.mock('../services/api', () => ({
  fetchContests: vi.fn(),
  fetchNextContest: vi.fn(),
  fetchPlatformStatuses: vi.fn(),
  triggerAdminRefresh: vi.fn(),
  recordStudentVisit: vi.fn(),
  fetchAnalyticsStats: vi.fn(),
}));

describe('Student Analytics & Traffic Tracking', () => {
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
      {
        month: '2026-10',
        month_name: 'Oct 2026',
        unique_students: 65,
        total_visits: 510,
      },
    ],
    visitor_id: 'stu_unit_test',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.fetchContests).mockResolvedValue({
      items: [],
      total: 0,
      limit: 150,
      offset: 0,
    });
    vi.mocked(api.fetchNextContest).mockResolvedValue(null);
    vi.mocked(api.fetchPlatformStatuses).mockResolvedValue([]);
    vi.mocked(api.recordStudentVisit).mockResolvedValue(mockAnalytics);
    vi.mocked(api.fetchAnalyticsStats).mockResolvedValue(mockAnalytics);
  });

  it('displays the total website visits counter on the top header', async () => {
    render(<App />);

    // Top header visit counter should render with formatted total visits and monthly active
    await waitFor(() => {
      const topBtn = screen.getByTestId('header-visit-counter');
      expect(topBtn).toBeInTheDocument();
      expect(topBtn).toHaveTextContent('1,420 visits');
      expect(topBtn).toHaveTextContent('85 students/mo');
    });
  });

  it('opens analytics modal on clicking top counter, showing MAU, total visits, and monthly breakdown', async () => {
    render(<App />);

    const topBtn = await screen.findByTestId('header-visit-counter');
    fireEvent.click(topBtn);

    // Modal dialog opens
    const modal = screen.getByRole('dialog', { name: /student usage and website visits analytics/i });
    expect(modal).toBeInTheDocument();

    // Verify key metrics in modal
    expect(within(modal).getByTestId('metric-total-visits')).toHaveTextContent('1,420');
    expect(within(modal).getByTestId('metric-monthly-active')).toHaveTextContent('85');
    expect(within(modal).getByTestId('metric-weekly-active')).toHaveTextContent('44');
    expect(within(modal).getByTestId('metric-today-visits')).toHaveTextContent('23');

    // Verify monthly history breakdown rows
    expect(within(modal).getByText('Nov 2026')).toBeInTheDocument();
    expect(within(modal).getByText('85 students')).toBeInTheDocument();
    expect(within(modal).getByText('Oct 2026')).toBeInTheDocument();
    expect(within(modal).getByText('65 students')).toBeInTheDocument();

    // Close modal via close button
    const closeBtn = within(modal).getByRole('button', { name: /^Close$/i });
    fireEvent.click(closeBtn);

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });
});
