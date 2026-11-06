import React from 'react';
import { Moon, Sun, ChevronDown, Eye, Volume2, VolumeX } from 'lucide-react';
import { TimezoneOption } from '../utils/date';

interface HeaderProps {
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  timezone: string;
  onTimezoneChange: (tz: string) => void;
  timezones: TimezoneOption[];
  totalVisits?: number;
  isSoundMuted?: boolean;
  onToggleSound?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  theme,
  onToggleTheme,
  timezone,
  onTimezoneChange,
  timezones,
  totalVisits,
  isSoundMuted = false,
  onToggleSound,
}) => {
  const visitCountFormatted = totalVisits !== undefined ? totalVisits.toLocaleString() : '...';

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
          {/* Top Total Visits Pill with Clean Hover Tooltip */}
          {totalVisits !== undefined && (
            <div
              className="header-visit-pill"
              tabIndex={0}
              role="status"
              aria-label={`${visitCountFormatted} total website visits`}
              data-testid="header-visit-counter"
            >
              <Eye size={12} className="visit-btn-icon" aria-hidden="true" />
              <span className="visit-btn-count mono">
                {visitCountFormatted} visits
              </span>
              <div className="visit-hover-tooltip mono" role="tooltip">
                {visitCountFormatted} total website visits
              </div>
            </div>
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

          {onToggleSound && (
            <button
              type="button"
              className={`header-icon-btn sound-toggle-btn ${isSoundMuted ? 'muted' : ''}`}
              onClick={onToggleSound}
              aria-label={isSoundMuted ? 'Unmute celebration sound' : 'Mute celebration sound'}
              title={
                isSoundMuted
                  ? 'Celebration sound muted (click to unmute)'
                  : 'Celebration sound enabled (click to mute)'
              }
              data-testid="sound-toggle-btn"
            >
              {isSoundMuted ? <VolumeX size={13} /> : <Volume2 size={13} />}
            </button>
          )}

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
