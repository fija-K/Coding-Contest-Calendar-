import React from 'react';
import { Moon, Sun, ChevronDown } from 'lucide-react';
import { TimezoneOption } from '../utils/date';

interface HeaderProps {
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  timezone: string;
  onTimezoneChange: (tz: string) => void;
  timezones: TimezoneOption[];
}

export const Header: React.FC<HeaderProps> = ({
  theme,
  onToggleTheme,
  timezone,
  onTimezoneChange,
  timezones,
}) => {
  return (
    <header className="app-header">
      <div className="container header-content">
        {/* Brand identity */}
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">
            <span className="brand-sigil">CC</span>
          </div>
          <span className="brand-wordmark">ContestCal</span>
        </div>

        {/* Timezone and Theme controls */}
        <div className="header-controls">
          <div className="tz-select-wrap" title="Change displayed timezone">
            <select
              className="tz-select mono"
              value={timezone}
              onChange={(e) => onTimezoneChange(e.target.value)}
              aria-label="Select display timezone"
            >
              {timezones.map((tz) => (
                <option key={tz.value} value={tz.value}>
                  {tz.label} ({tz.offset})
                </option>
              ))}
            </select>
            <ChevronDown size={12} className="tz-icon" />
          </div>

          <button
            type="button"
            className="header-icon-btn"
            onClick={onToggleTheme}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {theme === 'dark' ? <Sun size={13} /> : <Moon size={13} />}
          </button>
        </div>
      </div>
    </header>
  );
};
