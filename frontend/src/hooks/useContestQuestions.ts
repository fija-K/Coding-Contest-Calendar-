import { useState, useEffect, useCallback, useMemo } from 'react';

export const QUESTIONS_STORAGE_KEY = 'ccc_contest_questions_solved';

export type ContestQuestionsMap = Record<string, number>;

/**
 * Safely parse stored questions-solved map from localStorage.
 * Handles missing, corrupted, or non-object values gracefully.
 */
export const loadQuestionsFromStorage = (): ContestQuestionsMap => {
  if (typeof window === 'undefined' || !window.localStorage) {
    return {};
  }

  try {
    const raw = localStorage.getItem(QUESTIONS_STORAGE_KEY);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const sanitized: ContestQuestionsMap = {};
      for (const [key, val] of Object.entries(parsed)) {
        if (typeof key === 'string' && key.trim().length > 0) {
          const num = Number(val);
          if (!isNaN(num) && num >= 0) {
            sanitized[key] = Math.min(Math.floor(num), 999);
          }
        }
      }
      return sanitized;
    }
    return {};
  } catch (err) {
    console.warn('Failed to parse contest questions from localStorage, using empty map fallback:', err);
    return {};
  }
};

/**
 * Safely persist contest questions map to localStorage.
 */
export const saveQuestionsToStorage = (questionsMap: ContestQuestionsMap): void => {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }

  try {
    localStorage.setItem(QUESTIONS_STORAGE_KEY, JSON.stringify(questionsMap));
  } catch (err) {
    console.error('Failed to save contest questions to localStorage:', err);
  }
};

export interface UseContestQuestionsReturn {
  questionsMap: ContestQuestionsMap;
  getQuestionsSolved: (contestId: string) => number;
  setQuestionsSolved: (contestId: string, count: number) => void;
  incrementQuestions: (contestId: string) => void;
  decrementQuestions: (contestId: string) => void;
  clearAllQuestions: () => void;
  totalQuestionsSolved: number;
}

export const useContestQuestions = (): UseContestQuestionsReturn => {
  const [questionsMap, setQuestionsMap] = useState<ContestQuestionsMap>(() => loadQuestionsFromStorage());

  // Listen for storage events across tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === QUESTIONS_STORAGE_KEY) {
        setQuestionsMap(loadQuestionsFromStorage());
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const getQuestionsSolved = useCallback(
    (contestId: string): number => {
      return questionsMap[contestId] || 0;
    },
    [questionsMap]
  );

  const setQuestionsSolved = useCallback((contestId: string, count: number) => {
    const safeCount = Math.max(0, Math.min(Math.floor(count || 0), 999));
    setQuestionsMap((prev) => {
      const next = { ...prev };
      if (safeCount === 0) {
        delete next[contestId];
      } else {
        next[contestId] = safeCount;
      }
      saveQuestionsToStorage(next);
      return next;
    });
  }, []);

  const incrementQuestions = useCallback((contestId: string) => {
    setQuestionsMap((prev) => {
      const current = prev[contestId] || 0;
      const next = { ...prev, [contestId]: Math.min(current + 1, 999) };
      saveQuestionsToStorage(next);
      return next;
    });
  }, []);

  const decrementQuestions = useCallback((contestId: string) => {
    setQuestionsMap((prev) => {
      const current = prev[contestId] || 0;
      const next = { ...prev };
      if (current <= 1) {
        delete next[contestId];
      } else {
        next[contestId] = current - 1;
      }
      saveQuestionsToStorage(next);
      return next;
    });
  }, []);

  const clearAllQuestions = useCallback(() => {
    setQuestionsMap({});
    saveQuestionsToStorage({});
  }, []);

  const totalQuestionsSolved = useMemo(() => {
    return Object.values(questionsMap).reduce((sum, val) => sum + (val || 0), 0);
  }, [questionsMap]);

  return {
    questionsMap,
    getQuestionsSolved,
    setQuestionsSolved,
    incrementQuestions,
    decrementQuestions,
    clearAllQuestions,
    totalQuestionsSolved,
  };
};
