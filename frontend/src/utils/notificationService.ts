export const NOTIF_ENABLED_KEY = 'ccc_notifications_enabled';
export const NOTIF_SOUND_KEY = 'ccc_notifications_sound_enabled';
export const NOTIFIED_CONTESTS_KEY = 'ccc_notified_contests';
export const CUSTOM_REMINDERS_KEY = 'ccc_custom_contest_reminders';

export interface NotificationPayload {
  title: string;
  body: string;
  url?: string;
  contestId?: string;
  icon?: string;
  tag?: string;
}

/**
 * Checks whether the browser supports HTML5 Web Notifications.
 */
export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

/**
 * Retrieves the current permission state ('granted' | 'denied' | 'default').
 */
export function getNotificationPermission(): NotificationPermission {
  if (!isNotificationSupported()) {
    return 'denied';
  }
  return Notification.permission;
}

/**
 * Requests native desktop/mobile notification permission from the user.
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isNotificationSupported()) {
    return 'denied';
  }
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      setNotificationsEnabled(true);
    }
    return permission;
  } catch (err) {
    console.warn('Error requesting notification permission:', err);
    return 'denied';
  }
}

/**
 * Checks whether the user has toggled notifications ON in ContestCal settings.
 */
export function areNotificationsEnabled(): boolean {
  if (typeof window === 'undefined' || !window.localStorage) {
    return false;
  }
  try {
    const stored = localStorage.getItem(NOTIF_ENABLED_KEY);
    if (stored !== null) {
      return stored === 'true';
    }
    // If browser permission is already granted, default to true
    return getNotificationPermission() === 'granted';
  } catch {
    return false;
  }
}

/**
 * Persists the user's notification master toggle state.
 */
export function setNotificationsEnabled(enabled: boolean): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    localStorage.setItem(NOTIF_ENABLED_KEY, enabled ? 'true' : 'false');
  } catch (err) {
    console.warn('Could not persist notifications enabled state:', err);
  }
}

/**
 * Checks whether audio reminder chime is enabled.
 */
export function isNotificationSoundEnabled(): boolean {
  if (typeof window === 'undefined' || !window.localStorage) return true;
  try {
    return localStorage.getItem(NOTIF_SOUND_KEY) !== 'false';
  } catch {
    return true;
  }
}

/**
 * Persists audio reminder chime preference.
 */
export function setNotificationSoundEnabled(enabled: boolean): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    localStorage.setItem(NOTIF_SOUND_KEY, enabled ? 'true' : 'false');
  } catch (err) {
    console.warn('Could not persist notification sound state:', err);
  }
}

/**
 * Returns the set of contest IDs that have already received a notification
 * so students are never notified repeatedly for the same contest.
 */
export function getNotifiedContests(): Set<string> {
  if (typeof window === 'undefined' || !window.localStorage) {
    return new Set<string>();
  }
  try {
    const raw = localStorage.getItem(NOTIFIED_CONTESTS_KEY);
    if (!raw) return new Set<string>();
    const parsed = JSON.parse(raw);
    return new Set<string>(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set<string>();
  }
}

/**
 * Records that a contest notification has been sent.
 */
export function markContestNotified(contestId: string): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const set = getNotifiedContests();
    set.add(contestId);
    // Keep max 200 contest IDs to prevent localStorage growth
    const list = Array.from(set).slice(-200);
    localStorage.setItem(NOTIFIED_CONTESTS_KEY, JSON.stringify(list));
  } catch (err) {
    console.warn('Could not mark contest notified:', err);
  }
}

/**
 * Clears the notified contest log (useful for testing and reset).
 */
export function clearNotifiedContests(): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    localStorage.removeItem(NOTIFIED_CONTESTS_KEY);
  } catch {}
}

/**
 * Checks if a specific contest has an individual reminder enabled.
 * If per-contest overrides are empty, all upcoming contests receive reminders when global is ON.
 */
export function isContestReminderActive(contestId: string, globalEnabled: boolean): boolean {
  if (!globalEnabled) return false;
  if (typeof window === 'undefined' || !window.localStorage) return globalEnabled;
  try {
    const raw = localStorage.getItem(CUSTOM_REMINDERS_KEY);
    if (!raw) return true; // Default: all active
    const map = JSON.parse(raw);
    if (typeof map === 'object' && map !== null) {
      if (contestId in map) {
        return Boolean(map[contestId]);
      }
    }
    return true;
  } catch {
    return true;
  }
}

/**
 * Toggles the reminder for an individual contest.
 */
export function setContestReminderActive(contestId: string, active: boolean): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const raw = localStorage.getItem(CUSTOM_REMINDERS_KEY);
    const map = raw ? JSON.parse(raw) : {};
    map[contestId] = active;
    localStorage.setItem(CUSTOM_REMINDERS_KEY, JSON.stringify(map));
  } catch (err) {
    console.warn('Could not save contest reminder toggle:', err);
  }
}

/**
 * Sends a native desktop or mobile push notification via Service Worker
 * with fallback to standard window Notification.
 */
export async function sendBrowserNotification(payload: NotificationPayload): Promise<boolean> {
  if (!isNotificationSupported() || Notification.permission !== 'granted') {
    return false;
  }

  const { title, body, url, icon, tag } = payload;
  const options: NotificationOptions = {
    body,
    icon: icon || "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23A970FF' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><rect width='18' height='18' x='3' y='4' rx='2' ry='2'/><line x1='16' x2='16' y1='2' y2='6'/><line x1='8' x2='8' y1='2' y2='6'/><line x1='3' x2='21' y1='10' y2='10'/><path d='m9 16 2 2 4-4'/></svg>",
    badge: icon || "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23A970FF'><circle cx='12' cy='12' r='10'/></svg>",
    tag: tag || `contest-reminder-${Date.now()}`,
    data: {
      url: url || (typeof window !== 'undefined' ? window.location.href : '/'),
    },
    // Keep notification visible until user interacts with it
    requireInteraction: false,
  };

  // 1. Try Service Worker showNotification if active
  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg && reg.active) {
        await reg.showNotification(title, options);
        return true;
      }
    } catch (swErr) {
      console.debug('ServiceWorker notification fallback to window.Notification:', swErr);
    }
  }

  // 2. Fallback to standard window Notification
  try {
    const notification = new Notification(title, options);
    notification.onclick = (event) => {
      event.preventDefault();
      try {
        window.focus();
      } catch {}
      if (url) {
        window.open(url, '_blank', 'noopener,noreferrer');
      }
      notification.close();
    };
    return true;
  } catch (err) {
    console.warn('Native notification failed:', err);
    return false;
  }
}

/**
 * Safely registers the Service Worker for push notifications in supported environments.
 */
export function registerServiceWorker(): void {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.debug('ContestCal Service Worker registered successfully:', registration.scope);
      })
      .catch((err) => {
        console.debug('Service Worker registration skipped or failed:', err);
      });
  });
}
