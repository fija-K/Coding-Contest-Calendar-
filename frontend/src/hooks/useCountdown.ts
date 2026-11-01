import { useState, useEffect, useCallback } from 'react';
import { calculateCountdown, CountdownState } from '../utils/date';

export function useCountdown(startTimeIso: string, endTimeIso: string): CountdownState {
  const getLatest = useCallback(() => {
    return calculateCountdown(startTimeIso, endTimeIso, new Date());
  }, [startTimeIso, endTimeIso]);

  const [countdown, setCountdown] = useState<CountdownState>(getLatest);

  useEffect(() => {
    // Initial evaluation
    setCountdown(getLatest());

    const timer = setInterval(() => {
      setCountdown(getLatest());
    }, 1000);

    // Re-synchronize when tab becomes visible after backgrounding or sleep
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        setCountdown(getLatest());
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);

    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
    };
  }, [getLatest]);

  return countdown;
}
