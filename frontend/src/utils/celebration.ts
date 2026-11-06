import { playClappingSound } from './sound';

export const CELEBRATED_STORAGE_KEY = 'ccc_celebrated_contests';

export interface ClapShowerOptions {
  contestId?: string;
  contestName?: string;
  message?: string;
  particleCount?: number;
}

/**
 * Returns the set of contest IDs that have already triggered a celebration.
 */
export function getCelebratedContests(): Set<string> {
  if (typeof window === 'undefined' || !window.localStorage) {
    return new Set<string>();
  }
  try {
    const raw = localStorage.getItem(CELEBRATED_STORAGE_KEY);
    if (!raw) return new Set<string>();
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return new Set<string>(parsed.filter((id): id is string => typeof id === 'string'));
    }
    return new Set<string>();
  } catch {
    return new Set<string>();
  }
}

/**
 * Returns true if the contest has already celebrated completion.
 */
export function hasCelebratedContest(contestId: string): boolean {
  return getCelebratedContests().has(contestId);
}

/**
 * Marks a contest ID as celebrated in persistent storage.
 */
export function markContestCelebrated(contestId: string): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const set = getCelebratedContests();
    set.add(contestId);
    localStorage.setItem(CELEBRATED_STORAGE_KEY, JSON.stringify(Array.from(set)));
  } catch (err) {
    console.warn('Could not save celebrated contest state:', err);
  }
}

/**
 * Resets all celebrated contest records.
 */
export function clearCelebratedContests(): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    localStorage.removeItem(CELEBRATED_STORAGE_KEY);
  } catch {}
}

/**
 * Displays a subtle non-motion toast when user prefers reduced motion.
 */
function showReducedMotionToast(message: string): void {
  const existing = document.getElementById('celebration-reduced-toast');
  if (existing) {
    existing.remove();
  }

  const toast = document.createElement('div');
  toast.id = 'celebration-reduced-toast';
  toast.className = 'celebration-reduced-motion-toast';
  toast.setAttribute('role', 'status');
  toast.setAttribute('data-testid', 'celebration-reduced-toast');
  toast.textContent = message;

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => {
      if (toast.parentNode) {
        toast.remove();
      }
    }, 350);
  }, 2200);
}

/**
 * Triggers a full-screen clapping emoji shower celebration.
 *
 * Characteristics:
 * - Fixed full-viewport overlay with pointer-events: none (does not block clicks).
 * - 40-60 emojis raining down: mostly 👏, mixed with 🎉 ✨ 🏆 🔥.
 * - Random sizes (24-48px), positions, rotation, and sideways drift.
 * - Spawns over ~1s in staggered waves, falls at varying speeds with gentle fade near bottom.
 * - Plays soft applause clip once (unless muted).
 * - Fades in a small "Contest completed! 👏" center card that fades out with the shower.
 * - Complete automatic removal after ~3.2s with zero leftover DOM or animation loops.
 * - Respects prefers-reduced-motion by skipping the shower and sound, showing only a small toast.
 */
export function triggerClapShower(options?: ClapShowerOptions): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const message = options?.message || 'Contest completed! 👏';
  const subtitle = options?.contestName;
  const count = options?.particleCount || 50;

  // 1. Check prefers-reduced-motion
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    showReducedMotionToast(message);
    return;
  }

  // 2. Play soft clapping audio (if unmuted)
  playClappingSound(0.22);

  // 3. Clean up any existing overlay
  const existing = document.getElementById('celebration-overlay');
  if (existing) {
    existing.remove();
  }

  // 4. Create new full-screen overlay container
  const overlay = document.createElement('div');
  overlay.id = 'celebration-overlay';
  overlay.className = 'celebration-overlay';
  overlay.setAttribute('role', 'status');
  overlay.setAttribute('aria-live', 'polite');
  overlay.setAttribute('data-testid', 'celebration-overlay');

  // Emoji pool: mostly 👏 (approx 60%), accompanied by celebratory symbols
  const EMOJI_POOL = ['👏', '👏', '👏', '👏', '👏', '🎉', '✨', '🏆', '🔥'];

  // 5. Generate emojis in staggered waves
  for (let i = 0; i < count; i++) {
    const span = document.createElement('span');
    span.className = 'celebration-emoji-particle';
    span.textContent = EMOJI_POOL[Math.floor(Math.random() * EMOJI_POOL.length)];

    const left = (Math.random() * 94 + 3).toFixed(1) + '%';
    const size = Math.floor(Math.random() * 25) + 24; // 24px - 48px
    const duration = (1.8 + Math.random() * 1.0).toFixed(2) + 's'; // 1.8s - 2.8s
    const delay = (Math.random() * 1.05).toFixed(2) + 's'; // 0s - 1.05s in waves
    const driftStart = (Math.random() * 30 - 15).toFixed(0) + 'px';
    const driftEnd = (Math.random() * 120 - 60).toFixed(0) + 'px';
    const rotStart = (Math.random() * 40 - 20).toFixed(0) + 'deg';
    const rotEnd = (Math.random() * 100 - 50).toFixed(0) + 'deg';

    span.style.left = left;
    span.style.fontSize = `${size}px`;
    span.style.animationDuration = duration;
    span.style.animationDelay = delay;
    span.style.setProperty('--drift-start', driftStart);
    span.style.setProperty('--drift-end', driftEnd);
    span.style.setProperty('--rot-start', rotStart);
    span.style.setProperty('--rot-end', rotEnd);

    overlay.appendChild(span);
  }

  // 6. Small center celebration badge
  const centerCard = document.createElement('div');
  centerCard.className = 'celebration-center-card';
  centerCard.setAttribute('data-testid', 'celebration-center-card');

  const iconSpan = document.createElement('span');
  iconSpan.className = 'celebration-center-icon';
  iconSpan.textContent = '👏';

  const textWrap = document.createElement('div');
  textWrap.className = 'celebration-center-text';

  const titleSpan = document.createElement('span');
  titleSpan.className = 'celebration-center-title';
  titleSpan.textContent = message;
  textWrap.appendChild(titleSpan);

  if (subtitle) {
    const subSpan = document.createElement('span');
    subSpan.className = 'celebration-center-subtitle';
    subSpan.textContent = subtitle;
    subSpan.title = subtitle;
    textWrap.appendChild(subSpan);
  }

  centerCard.appendChild(iconSpan);
  centerCard.appendChild(textWrap);
  overlay.appendChild(centerCard);

  document.body.appendChild(overlay);

  // 7. Auto-remove overlay after ~3.25 seconds
  setTimeout(() => {
    if (overlay.parentNode) {
      overlay.remove();
    }
  }, 3250);
}
