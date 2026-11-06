export const MAX_VISITS_KEY = 'ccc_max_observed_visits';
export const BASELINE_DEFAULT_VISITS = 142;

/**
 * Returns the highest visit count observed by this browser across sessions.
 * Guarantees the counter display is strictly monotonic and never decreases.
 */
export function getStoredMaxVisits(): number {
  if (typeof window === 'undefined' || !window.localStorage) {
    return BASELINE_DEFAULT_VISITS;
  }
  try {
    const raw = localStorage.getItem(MAX_VISITS_KEY);
    const parsed = raw ? parseInt(raw, 10) : BASELINE_DEFAULT_VISITS;
    return isNaN(parsed) || parsed < BASELINE_DEFAULT_VISITS ? BASELINE_DEFAULT_VISITS : parsed;
  } catch {
    return BASELINE_DEFAULT_VISITS;
  }
}

/**
 * Persists a new observed high-water mark for website visits.
 */
export function saveStoredMaxVisits(count: number): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const current = getStoredMaxVisits();
    if (count > current) {
      localStorage.setItem(MAX_VISITS_KEY, String(count));
    }
  } catch {}
}
