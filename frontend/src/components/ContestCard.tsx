import React from 'react';
import { ExternalLink, Clock, Calendar as CalendarIcon, Radio, CheckCircle2, Circle } from 'lucide-react';
import { Contest } from '../types/contest';
import { formatDateTime, formatDuration } from '../utils/date';
import { useCountdown } from '../hooks/useCountdown';

interface ContestCardProps {
  contest: Contest;
  timezone: string;
  isCompleted?: boolean;
  onToggleComplete?: (contestId: string) => void;
}

export const ContestCard: React.FC<ContestCardProps> = ({
  contest,
  timezone,
  isCompleted = false,
  onToggleComplete,
}) => {
  const countdown = useCountdown(contest.start_time, contest.end_time);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (onToggleComplete) {
      onToggleComplete(contest.id);
    }
  };

  return (
    <div
      className={`contest-row ${isCompleted ? 'is-completed' : ''}`}
      data-testid={`contest-card-${contest.id}`}
      role="article"
    >
      {/* 1. Completion Toggle Column */}
      <div className="row-completion-col">
        {onToggleComplete && (
          <button
            type="button"
            className={`completion-toggle-btn ${isCompleted ? 'is-completed' : ''}`}
            onClick={handleToggle}
            aria-label={isCompleted ? 'Completed' : 'Mark completed'}
            title={isCompleted ? 'Completed' : 'Mark completed'}
            data-testid={`complete-btn-${contest.id}`}
          >
            {isCompleted ? (
              <CheckCircle2 size={14} className="check-icon-completed" />
            ) : (
              <Circle size={14} className="check-icon-uncompleted" />
            )}
            <span className="completion-btn-text">
              {isCompleted ? 'Completed' : 'Mark completed'}
            </span>
          </button>
        )}
      </div>

      {/* 2. Platform Column */}
      <div className="row-platform-col">
        <span className={`platform-pill ${contest.platform}`}>
          {contest.platform}
        </span>
      </div>

      {/* 3. Contest Title & Schedule Meta Column */}
      <div className="row-main-col">
        <h3 className="row-contest-title" title={contest.name}>
          {contest.name}
        </h3>
        <div className="row-meta-strip">
          <span className="row-meta-item">
            <CalendarIcon size={11} className="meta-icon" />
            <span className="mono">{formatDateTime(contest.start_time, timezone)}</span>
          </span>
          <span className="row-meta-item">
            <Clock size={11} className="meta-icon" />
            <span className="mono">{formatDuration(contest.duration_seconds)}</span>
          </span>
          {countdown.isOngoing ? (
            <span className="status-tag live">
              <Radio size={8} /> LIVE
            </span>
          ) : countdown.isUpcoming ? (
            <span className="status-tag upcoming">Upcoming</span>
          ) : (
            <span className="status-tag completed">Ended</span>
          )}
          {isCompleted && (
            <span className="status-tag user-completed" data-testid="completed-badge">
              <CheckCircle2 size={9} /> Completed
            </span>
          )}
        </div>
      </div>

      {/* 4. Tabular Monospace Countdown Column */}
      <div className="row-countdown-col">
        <span
          className={`row-countdown-text mono ${countdown.isCompleted ? 'ended' : ''}`}
          data-testid="countdown-text"
        >
          {countdown.formatted}
        </span>
      </div>

      {/* 5. External Action Button Column */}
      <div className="row-action-col">
        <a
          href={contest.contest_url}
          target="_blank"
          rel="noopener noreferrer"
          className="row-link-btn"
          aria-label={`Open ${contest.name} on ${contest.platform}`}
          onClick={(e) => e.stopPropagation()}
        >
          <span>Official Page</span>
          <ExternalLink size={10} />
        </a>
      </div>
    </div>
  );
};
