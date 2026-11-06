import React from 'react';
import { Moon, Sun, ChevronDown, Eye } from 'lucide-react';
import { TimezoneOption } from '../utils/date';

interface HeaderProps {
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  timezone: string;
  onTimezoneChange: (tz: string) => void;
  timezones: TimezoneOption[];
  totalVisits?: number;
  activeThisMonth?: number;
  onOpenAnalytics?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  theme,
  onToggleTheme,
  timezone,
  onTimezoneChange,
  timezones,
  totalVisits,
  activeThisMonth,
  onOpenAnalytics,
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

        {/* Header Controls & Top Traffic Counter */}
        <div className="header-controls">
          {/* Top Total Visits & Monthly Student Counter */}
          {onOpenAnalytics && (
            <button
              type="button"
              className="header-visit-counter-btn"
              onClick={onOpenAnalytics}
              title="Total website visits • Click for detailed student usage analytics"
              aria-label="View student visits and traffic analytics"
              data-testid="header-visit-counter"
            >
              <Eye size={12} className="visit-btn-icon" />
              <span className="visit-btn-count mono">
                {totalVisits !== undefined ? `${totalVisits.toLocaleString()} visits` : 'Visits'}
              </span>
              {activeThisMonth !== undefined && (
                <span className="visit-btn-monthly mono">
                  &bull; {activeThisMonth} students/mo
                </span>
              )}
            </button>
          )}

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
