import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ContestCard } from '../components/ContestCard';
import { Contest } from '../types/contest';

describe('ContestCard Component', () => {
  const mockContest: Contest = {
    id: 'codeforces_2000',
    platform: 'codeforces',
    external_id: '2000',
    name: 'Codeforces Round 1000 (Div. 2)',
    start_time: '2026-11-10T14:35:00Z',
    end_time: '2026-11-10T16:35:00Z',
    duration_seconds: 7200,
    contest_url: 'https://codeforces.com/contest/2000',
    status: 'upcoming',
    created_at: '2026-11-01T00:00:00Z',
    updated_at: '2026-11-01T00:00:00Z',
  };

  it('renders contest details and platform badge', () => {
    render(<ContestCard contest={mockContest} timezone="Asia/Kolkata" />);

    expect(screen.getByText('Codeforces Round 1000 (Div. 2)')).toBeInTheDocument();
    expect(screen.getByText('codeforces')).toBeInTheDocument();
    expect(screen.getByText(/2h/)).toBeInTheDocument();

    const link = screen.getByRole('link', { name: /Open Codeforces Round 1000/i });
    expect(link).toHaveAttribute('href', 'https://codeforces.com/contest/2000');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('renders GeeksforGeeks contest details correctly', () => {
    const mockGfgContest: Contest = {
      id: 'gfg_weekly_100',
      platform: 'gfg',
      external_id: 'weekly-100',
      name: 'GFG Weekly Coding Contest - 100',
      start_time: '2026-11-15T13:30:00Z',
      end_time: '2026-11-15T15:00:00Z',
      duration_seconds: 5400,
      contest_url: 'https://practice.geeksforgeeks.org/contest/weekly-100',
      status: 'upcoming',
      created_at: '2026-11-01T00:00:00Z',
      updated_at: '2026-11-01T00:00:00Z',
    };

    render(<ContestCard contest={mockGfgContest} timezone="Asia/Kolkata" />);

    expect(screen.getByText('GFG Weekly Coding Contest - 100')).toBeInTheDocument();
    expect(screen.getByText('gfg')).toBeInTheDocument();
    expect(screen.getByText(/1h 30m/)).toBeInTheDocument();

    const link = screen.getByRole('link', { name: /Open GFG Weekly Coding Contest - 100/i });
    expect(link).toHaveAttribute('href', 'https://practice.geeksforgeeks.org/contest/weekly-100');
  });

  it('renders uncompleted state with "Mark completed" and handles clicks', () => {
    const onToggle = vi.fn();
    render(
      <ContestCard
        contest={mockContest}
        timezone="Asia/Kolkata"
        isCompleted={false}
        onToggleComplete={onToggle}
      />
    );

    const btn = screen.getByRole('button', { name: /^Mark completed$/i });
    expect(btn).toBeInTheDocument();
    fireEvent.click(btn);
    expect(onToggle).toHaveBeenCalledWith('codeforces_2000');
  });

  it('renders completed state with "Completed" label and badge', () => {
    const onToggle = vi.fn();
    render(
      <ContestCard
        contest={mockContest}
        timezone="Asia/Kolkata"
        isCompleted={true}
        onToggleComplete={onToggle}
      />
    );

    const btn = screen.getByRole('button', { name: /^Completed$/i });
    expect(btn).toBeInTheDocument();
    expect(screen.getByTestId('completed-badge')).toBeInTheDocument();
    expect(screen.getByTestId(`contest-card-${mockContest.id}`)).toHaveClass('is-completed');

    fireEvent.click(btn);
    expect(onToggle).toHaveBeenCalledWith('codeforces_2000');
  });
});
