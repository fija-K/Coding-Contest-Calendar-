import React from 'react';
import { Clock, Calendar as CalendarIcon, ArrowUpRight } from 'lucide-react';
import { Contest } from '../types/contest';
import { formatDateTime, formatDuration } from '../utils/date';
import { useCountdown } from '../hooks/useCountdown';

interface HeroNextContestProps {
  contest: Contest | null;
  timezone: string;
}

export const HeroNextContest: React.FC<HeroNextContestProps> = ({ contest, timezone }) => {
  if (!contest) return null;

  const countdown = useCountdown(contest.start_time, contest.end_time);

  return (
    <section className="hero-focal-card" aria-label="Next upcoming contest">
      <div className="hero-kicker-row">
        <div className="hero-kicker-badge">
          <span className="hero-kicker-dot" aria-hidden="true" />
          <span>UP NEXT</span>
        </div>
        <span className={`platform-pill ${contest.platform}`}>
          {contest.platform}
        </span>
      </div>

      <div className="hero-body-row">
        <div className="hero-details-col">
          <h2 className="hero-title" title={contest.name}>
            {contest.name}
          </h2>
          <div className="hero-meta-row">
            <span className="hero-meta-item">
              <CalendarIcon size={12} className="meta-icon" />
              <span className="mono">{formatDateTime(contest.start_time, timezone)}</span>
            </span>
            <span className="meta-divider" aria-hidden="true">•</span>
            <span className="hero-meta-item">
              <Clock size={12} className="meta-icon" />
              <span className="mono">{formatDuration(contest.duration_seconds)}</span>
            </span>
          </div>
        </div>

        <div className="hero-action-col">
          <div className="hero-countdown-panel">
            <span className="hero-countdown-label mono">STARTS IN</span>
            <div className="hero-countdown-value mono">
              {countdown.formatted}
            </div>
          </div>
          <a
            href={contest.contest_url}
            target="_blank"
            rel="noopener noreferrer"
            className="hero-primary-btn"
            aria-label={`View ${contest.name} on ${contest.platform}`}
          >
            <span>View contest</span>
            <ArrowUpRight size={13} />
          </a>
        </div>
      </div>
    </section>
  );
};
