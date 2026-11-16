import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { useContestNotifications } from '../hooks/useContestNotifications';
import { NotificationModal } from '../components/NotificationModal';
import { NotificationToast } from '../components/NotificationToast';
import { Header } from '../components/Header';
import { Contest } from '../types/contest';
import * as notifService from '../utils/notificationService';
import * as soundModule from '../utils/sound';

describe('5-Minute Contest Notification & Reminder System', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('renders NotificationToast with contest name and join link', () => {
    const onDismiss = vi.fn();
    const testToast = {
      id: 'toast-1',
      contestId: 'codeforces_1234',
      name: 'Educational Codeforces Round 196',
      platform: 'codeforces',
      url: 'https://codeforces.com/contest/1234',
      startTime: new Date().toISOString(),
      minutesUntil: 5,
    };

    render(<NotificationToast toast={testToast} onDismiss={onDismiss} />);

    expect(screen.getByTestId('contest-notification-toast')).toBeInTheDocument();
    expect(screen.getByText('STARTS IN 5 MINUTES')).toBeInTheDocument();
    expect(screen.getByText('Educational Codeforces Round 196')).toBeInTheDocument();

    const joinBtn = screen.getByRole('link', { name: /Join Contest/i });
    expect(joinBtn).toHaveAttribute('href', 'https://codeforces.com/contest/1234');

    const dismissBtn = screen.getByRole('button', { name: /Dismiss/i });
    fireEvent.click(dismissBtn);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('renders NotificationModal and toggles 5-minute reminder settings', async () => {
    const onClose = vi.fn();
    const onToggleEnabled = vi.fn();
    const onToggleSound = vi.fn();
    const onSendTest = vi.fn();

    render(
      <NotificationModal
        isOpen={true}
        onClose={onClose}
        enabled={true}
        permission="granted"
        soundEnabled={true}
        onToggleEnabled={onToggleEnabled}
        onToggleSound={onToggleSound}
        onSendTest={onSendTest}
      />
    );

    expect(screen.getByTestId('notification-modal')).toBeInTheDocument();
    expect(screen.getByText('5-Minute Start Reminders')).toBeInTheDocument();
    expect(screen.getByText('Push Notifications Active')).toBeInTheDocument();

    // Toggle notification master switch
    const notifSwitch = screen.getByTestId('toggle-notif-switch');
    fireEvent.click(notifSwitch);
    expect(onToggleEnabled).toHaveBeenCalledTimes(1);

    // Toggle sound switch
    const soundSwitch = screen.getByTestId('toggle-sound-switch');
    fireEvent.click(soundSwitch);
    expect(onToggleSound).toHaveBeenCalledTimes(1);

    // Send test notification
    const testBtn = screen.getByTestId('test-notification-btn');
    await act(async () => {
      fireEvent.click(testBtn);
    });
    expect(onSendTest).toHaveBeenCalledTimes(1);
  });

  it('renders Header with bell reminder button and opens modal', () => {
    const onOpenNotifications = vi.fn();

    render(
      <Header
        theme="dark"
        onToggleTheme={vi.fn()}
        timezone="UTC"
        onTimezoneChange={vi.fn()}
        timezones={[{ value: 'UTC', label: 'UTC', offset: '+00:00' }]}
        totalVisits={150}
        onOpenNotifications={onOpenNotifications}
        notificationsEnabled={true}
      />
    );

    const bellBtn = screen.getByTestId('header-notif-btn');
    expect(bellBtn).toBeInTheDocument();
    expect(bellBtn).toHaveClass('active');

    fireEvent.click(bellBtn);
    expect(onOpenNotifications).toHaveBeenCalledTimes(1);
  });

  it('automatically triggers notification and toast when a contest starts within 5 minutes', () => {
    const chimeSpy = vi.spyOn(soundModule, 'playReminderChime').mockImplementation(() => {});
    const sendNotifSpy = vi.spyOn(notifService, 'sendBrowserNotification').mockResolvedValue(true);

    const now = new Date('2026-11-16T18:00:00Z');
    // Contest starts in 4 minutes and 30 seconds
    const contestStartingSoon: Contest = {
      id: 'cf_round_soon',
      name: 'Codeforces Round 1134 (Div. 4)',
      platform: 'codeforces',
      external_id: '1134',
      start_time: '2026-11-16T18:04:30Z',
      end_time: '2026-11-16T20:04:30Z',
      duration_seconds: 7200,
      contest_url: 'https://codeforces.com/contest/1134',
      status: 'upcoming',
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    };

    // Contest starts tomorrow (should not trigger)
    const contestTomorrow: Contest = {
      id: 'cf_round_tomorrow',
      name: 'Codeforces Round Tomorrow',
      platform: 'codeforces',
      external_id: '1135',
      start_time: '2026-11-17T18:00:00Z',
      end_time: '2026-11-17T20:00:00Z',
      duration_seconds: 7200,
      contest_url: 'https://codeforces.com/contest/1135',
      status: 'upcoming',
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    };

    const DummyComponent = () => {
      const { activeToast } = useContestNotifications({
        contests: [contestStartingSoon, contestTomorrow],
        currentTime: now,
        isCompleted: () => false,
      });

      return (
        <div>
          {activeToast && <span data-testid="test-active-toast">{activeToast.name}</span>}
        </div>
      );
    };

    // Force enabled
    localStorage.setItem(notifService.NOTIF_ENABLED_KEY, 'true');

    render(<DummyComponent />);

    // Assert that the contest starting in 4m 30s triggered the alert!
    expect(screen.getByTestId('test-active-toast')).toHaveTextContent('Codeforces Round 1134 (Div. 4)');
    expect(chimeSpy).toHaveBeenCalled();
    expect(sendNotifSpy).toBeDefined();
    expect(notifService.getNotifiedContests().has('cf_round_soon')).toBe(true);
    expect(notifService.getNotifiedContests().has('cf_round_tomorrow')).toBe(false);
  });
});
