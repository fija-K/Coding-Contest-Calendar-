import { useState, useEffect, useCallback } from 'react';

export const COMPLETED_STORAGE_KEY = 'ccc_completed_contests';

/**
 * Safely parse stored completed contest IDs from localStorage.
 * Handles missing, null, or malformed data gracefully.
 */
export const loadCompletedFromStorage = (): Set<string> => {
  if (typeof window === 'undefined' || !window.localStorage) {
    return new Set<string>();
  }

  try {
    const raw = localStorage.getItem(COMPLETED_STORAGE_KEY);
    if (!raw) {
      return new Set<string>();
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const validIds = parsed.filter(
        (id): id is string => typeof id === 'string' && id.trim().length > 0
      );
      return new Set<string>(validIds);
    }
    return new Set<string>();
  } catch (err) {
    console.warn('Failed to parse completed contests from localStorage, using empty set fallback:', err);
    return new Set<string>();
  }
};

/**
 * Safely persist completed contest IDs to localStorage.
 */
export const saveCompletedToStorage = (completedSet: Set<string>): void => {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }

  try {
    const arr = Array.from(completedSet);
    localStorage.setItem(COMPLETED_STORAGE_KEY, JSON.stringify(arr));
  } catch (err) {
    console.error('Failed to save completed contests to localStorage:', err);
  }
};

export interface UseCompletedContestsReturn {
  completedIds: Set<string>;
  isCompleted: (contestId: string) => boolean;
  toggleComplete: (contestId: string) => void;
  markCompleted: (contestId: string) => void;
  unmarkCompleted: (contestId: string) => void;
  clearAllCompleted: () => void;
}

export const useCompletedContests = (): UseCompletedContestsReturn => {
  const [completedIds, setCompletedIds] = useState<Set<string>>(() => loadCompletedFromStorage());

  // Listen for storage events across tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === COMPLETED_STORAGE_KEY) {
        setCompletedIds(loadCompletedFromStorage());
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const isCompleted = useCallback(
    (contestId: string): boolean => {
      return completedIds.has(contestId);
    },
    [completedIds]
  );

  const toggleComplete = useCallback((contestId: string) => {
    setCompletedIds((prev) => {
      const next = new Set(prev);
      if (next.has(contestId)) {
        next.delete(contestId);
      } else {
        next.add(contestId);
      }
      saveCompletedToStorage(next);
      return next;
    });
  }, []);

  const markCompleted = useCallback((contestId: string) => {
    setCompletedIds((prev) => {
      if (prev.has(contestId)) return prev;
      const next = new Set(prev);
      next.add(contestId);
      saveCompletedToStorage(next);
      return next;
    });
  }, []);

  const unmarkCompleted = useCallback((contestId: string) => {
    setCompletedIds((prev) => {
      if (!prev.has(contestId)) return prev;
      const next = new Set(prev);
      next.delete(contestId);
      saveCompletedToStorage(next);
      return next;
    });
  }, []);

  const clearAllCompleted = useCallback(() => {
    setCompletedIds(new Set<string>());
    saveCompletedToStorage(new Set<string>());
  }, []);

  return {
    completedIds,
    isCompleted,
    toggleComplete,
    markCompleted,
    unmarkCompleted,
    clearAllCompleted,
  };
};
