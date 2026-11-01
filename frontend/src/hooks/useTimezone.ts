import { useState } from 'react';
import { COMMON_TIMEZONES, TimezoneOption } from '../utils/date';

const STORAGE_KEY = 'ccc_selected_timezone';
const DEFAULT_TIMEZONE = 'Asia/Kolkata';

export function useTimezone() {
  const [timezone, setTimezoneState] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved || DEFAULT_TIMEZONE;
    } catch {
      return DEFAULT_TIMEZONE;
    }
  });

  const setTimezone = (newTz: string) => {
    setTimezoneState(newTz);
    try {
      localStorage.setItem(STORAGE_KEY, newTz);
    } catch {
      // ignore
    }
  };

  return {
    timezone,
    setTimezone,
    commonTimezones: COMMON_TIMEZONES as TimezoneOption[],
  };
}
