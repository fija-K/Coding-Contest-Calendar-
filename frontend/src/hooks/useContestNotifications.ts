import { useState, useEffect, useCallback, useRef } from 'react';
import { Contest } from '../types/contest';
import {
  isNotificationSupported,
  getNotificationPermission,
  requestNotificationPermission,
  areNotificationsEnabled,
  setNotificationsEnabled,
  isNotificationSoundEnabled,
  setNotificationSoundEnabled,
  getNotifiedContests,
  markContestNotified,
  isContestReminderActive,
  setContestReminderActive,
  sendBrowserNotification,
} from '../utils/notificationService';
import { playReminderChime } from '../utils/sound';

export interface ContestNotificationToast {
  id: string;
  contestId: string;
  name: string;
  platform: string;
  url: string;
  startTime: string;
  minutesUntil: number;
}

interface UseContestNotificationsOptions {
  contests: Contest[];
  currentTime: Date;
  isCompleted: (contestId: string) => boolean;
}

export function useContestNotifications({
  contests,
  currentTime,
  isCompleted,
}: UseContestNotificationsOptions) {
  const [supported] = useState<boolean>(() => isNotificationSupported());
  const [permission, setPermission] = useState<NotificationPermission>(() => getNotificationPermission());
  const [enabled, setEnabled] = useState<boolean>(() => areNotificationsEnabled());
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => isNotificationSoundEnabled());
  const [activeToast, setActiveToast] = useState<ContestNotificationToast | null>(null);

  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync state if browser permission changes
  useEffect(() => {
    if (supported) {
      setPermission(getNotificationPermission());
    }
  }, [supported]);

  const dismissToast = useCallback(() => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }
    setActiveToast(null);
  }, []);

  const showToast = useCallback((toast: ContestNotificationToast, autoDismissMs = 12000) => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    setActiveToast(toast);
    toastTimerRef.current = setTimeout(() => {
      setActiveToast(null);
      toastTimerRef.current = null;
    }, autoDismissMs);
  }, []);

  const enableNotifications = useCallback(async () => {
    const currentPerm = getNotificationPermission();
    if (currentPerm === 'granted') {
      setEnabled(true);
      setNotificationsEnabled(true);
      return true;
    }

    const newPerm = await requestNotificationPermission();
    setPermission(newPerm);

    if (newPerm === 'granted') {
      setEnabled(true);
      setNotificationsEnabled(true);
      return true;
    } else {
      // If blocked by browser, user can still have in-app banner alerts
      setEnabled(true);
      setNotificationsEnabled(true);
      return false;
    }
  }, []);

  const disableNotifications = useCallback(() => {
    setEnabled(false);
    setNotificationsEnabled(false);
  }, []);

  const toggleNotifications = useCallback(async () => {
    if (enabled) {
      disableNotifications();
    } else {
      await enableNotifications();
    }
  }, [enabled, enableNotifications, disableNotifications]);

  const toggleSound = useCallback(() => {
    setSoundEnabled((prev) => {
      const next = !prev;
      setNotificationSoundEnabled(next);
      return next;
    });
  }, []);

  const toggleContestReminder = useCallback((contestId: string) => {
    const isCurrentlyActive = isContestReminderActive(contestId, enabled);
    const nextState = !isCurrentlyActive;
    setContestReminderActive(contestId, nextState);
    return nextState;
  }, [enabled]);

  const sendTestNotification = useCallback(async () => {
    // 1. Play crystal chime sound
    if (soundEnabled) {
      playReminderChime(0.24);
    }

    // 2. In-App Toast Alert
    showToast({
      id: `test-toast-${Date.now()}`,
      contestId: 'test-contest',
      name: 'Educational Codeforces Round 196 (Test Alert)',
      platform: 'codeforces',
      url: 'https://codeforces.com',
      startTime: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      minutesUntil: 5,
    }, 9000);

    // 3. Native Browser Notification (if granted)
    if (permission === 'granted') {
      await sendBrowserNotification({
        title: '⚡ Codeforces Round starts in 5 minutes!',
        body: 'Codeforces • 5-minute contest reminder active and working on your device.',
        url: window.location.href,
        tag: 'test-notification',
      });
    }
  }, [soundEnabled, showToast, permission]);

  // Main 5-minute reminder checker against real-time clock
  useEffect(() => {
    if (!enabled || !contests.length) {
      return;
    }

    const now = currentTime.getTime();
    const notified = getNotifiedContests();

    for (const contest of contests) {
      // Skip completed contests
      if (isCompleted(contest.id)) {
        continue;
      }

      // Skip already notified contests
      if (notified.has(contest.id)) {
        continue;
      }

      // Check if user has active reminder for this contest
      if (!isContestReminderActive(contest.id, enabled)) {
        continue;
      }

      const startMs = new Date(contest.start_time).getTime();
      const diffMs = startMs - now;

      // 5-minute threshold: between 0 and 5 minutes (300,000 ms) before start
      // Also allow a 45s grace window if tab was recently focused
      if (diffMs <= 5 * 60 * 1000 && diffMs > -45 * 1000) {
        // Mark as notified so it never triggers again
        markContestNotified(contest.id);

        // 1. Send native browser notification
        if (permission === 'granted') {
          sendBrowserNotification({
            title: `⚡ ${contest.name} starts in 5 minutes!`,
            body: `${contest.platform.toUpperCase()} • Click to open the official contest page and join.`,
            url: contest.contest_url,
            contestId: contest.id,
            tag: `contest-${contest.id}`,
          });
        }

        // 2. Display prominent in-app toast
        showToast({
          id: `toast-${contest.id}`,
          contestId: contest.id,
          name: contest.name,
          platform: contest.platform,
          url: contest.contest_url,
          startTime: contest.start_time,
          minutesUntil: 5,
        });

        // 3. Audio chime
        if (soundEnabled) {
          playReminderChime(0.24);
        }
      }
    }
  }, [contests, currentTime, enabled, permission, soundEnabled, isCompleted, showToast]);

  return {
    supported,
    permission,
    enabled,
    soundEnabled,
    activeToast,
    enableNotifications,
    disableNotifications,
    toggleNotifications,
    toggleSound,
    toggleContestReminder,
    isContestReminderActive: (id: string) => isContestReminderActive(id, enabled),
    sendTestNotification,
    dismissToast,
  };
}
