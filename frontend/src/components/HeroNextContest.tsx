import React from 'react';
import { Clock, Calendar as CalendarIcon, ArrowUpRight, Radio } from 'lucide-react';
import { Contest } from '../types/contest';
import { formatDateTime, formatDuration, getContestLiveStatus } from '../utils/date';
import { useCountdown } from '../hooks/useCountdown';

export interface HeroNextContestProps {
  contest?: Contest | null;
  liveContest?: Contest | null;
  upNextContest?: Contest | null;
  timezone: string;
}

interface HeroCardItemProps {
  contest: Contest;
  mode: 'live' | 'upnext';
  timezone: string;
}

const HeroCardItem: React.FC<HeroCardItemProps> = ({ contest, mode, timezone }) => {
  const endTime = contest.end_time || new Date(new Date(contest.start_time).getTime() + contest.duration_seconds * 1000).toISOString();
  const countdown = useCountdown(contest.start_time, endTime);

  // If completed / expired, never render in hero
  if (countdown.isCompleted) {
    return null;
  }

  const isLive = mode === 'live' || countdown.isOngoing;

  // Clean countdown string (remove prefix like 'Starts in ' or 'Ends in ')
  const cleanCountdown = isLive
    ? countdown.formatted.replace(/^Ends in\s*/i, '')
    : countdown.formatted.replace(/^Starts in\s*/i, '');

  return (
    <section
      className={`hero-focal-card ${isLive ? 'is-live' : 'is-upnext'}`}
      aria-label={isLive ? `Live contest: ${contest.name}` : `Next upcoming contest: ${contest.name}`}
      data-testid={isLive ? 'hero-live-card' : 'hero-upnext-card'}
    >
      <div className="hero-kicker-row">
        <div className={`hero-kicker-badge ${isLive ? 'is-live' : ''}`}>
          <span className={`hero-kicker-dot ${isLive ? 'is-live' : ''}`} aria-hidden="true" />
          <span>{isLive ? 'LIVE NOW' : 'UP NEXT'}</span>
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
            {isLive && (
              <>
                <span className="meta-divider" aria-hidden="true">•</span>
                <span className="hero-meta-item hero-live-badge-inline">
                  <Radio size={11} className="meta-icon live-radio-icon" />
                  <span className="mono">Live</span>
                </span>
              </>
            )}
          </div>
        </div>

        <div className="hero-action-col">
          <div className="hero-countdown-panel">
            <span className={`hero-countdown-label mono ${isLive ? 'live-label' : ''}`}>
              {isLive ? 'ENDS IN' : 'STARTS IN'}
            </span>
            <div className={`hero-countdown-value mono ${isLive ? 'live-value' : ''}`} data-testid="hero-countdown">
              {cleanCountdown}
            </div>
          </div>
          <a
            href={contest.contest_url}
            target="_blank"
            rel="noopener noreferrer"
            className={`hero-primary-btn ${isLive ? 'is-live' : ''}`}
            aria-label={`${isLive ? 'Enter live contest' : 'View'} ${contest.name} on ${contest.platform}`}
          >
            <span>{isLive ? 'Enter live contest' : 'View contest'}</span>
            {isLive ? <Radio size={12} /> : <ArrowUpRight size={13} />}
          </a>
        </div>
      </div>
    </section>
  );
};

export const HeroNextContest: React.FC<HeroNextContestProps> = ({
  contest,
  liveContest,
  upNextContest,
  timezone,
}) => {
  // Resolve which contest(s) to render
  let effectiveLive = liveContest || null;
  let effectiveUpNext = upNextContest || null;

  // Backward compatibility when single `contest` prop is provided
  if (!effectiveLive && !effectiveUpNext && contest) {
    const status = getContestLiveStatus(contest.start_time, contest.end_time, new Date(), contest.duration_seconds);
    if (status === 'live') {
      effectiveLive = contest;
    } else if (status === 'upcoming') {
      effectiveUpNext = contest;
    }
    // If expired, both remain null
  }

  if (!effectiveLive && !effectiveUpNext) {
    return null;
  }

  return (
    <div className="hero-focal-wrapper" data-testid="hero-focal-wrapper">
      {/* Contests that are LIVE show BEFORE UP NEXT */}
      {effectiveLive && (
        <HeroCardItem
          key={`live-${effectiveLive.id}`}
          contest={effectiveLive}
          mode="live"
          timezone={timezone}
        />
      )}
      {/* UP NEXT contest */}
      {effectiveUpNext && (
        <HeroCardItem
          key={`upnext-${effectiveUpNext.id}`}
          contest={effectiveUpNext}
          mode="upnext"
          timezone={timezone}
        />
      )}
    </div>
  );
};
