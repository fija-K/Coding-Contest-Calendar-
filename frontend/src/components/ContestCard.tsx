import React from 'react';
import { ExternalLink, Clock, Calendar as CalendarIcon, Radio, CheckCircle2, Circle, Bell } from 'lucide-react';
import { Contest } from '../types/contest';
import { formatDateTime, formatDuration } from '../utils/date';
import { useCountdown } from '../hooks/useCountdown';

interface ContestCardProps {
  contest: Contest;
  timezone: string;
  isCompleted?: boolean;
  onToggleComplete?: (contestId: string) => void;
  autoRemoveDays?: number | null;
  isReminderActive?: boolean;
  onToggleReminder?: (contestId: string) => void;
  questionsSolved?: number;
  onUpdateQuestions?: (contestId: string, count: number) => void;
}

export const ContestCard: React.FC<ContestCardProps> = ({
  contest,
  timezone,
  isCompleted = false,
  onToggleComplete,
  autoRemoveDays,
  isReminderActive = false,
  onToggleReminder,
  questionsSolved = 0,
  onUpdateQuestions,
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
          {countdown.isUpcoming && !isCompleted && isReminderActive && (
            <span
              className="status-tag reminder-active-pill mono"
              title="5-minute start reminder active"
              data-testid={`reminder-pill-${contest.id}`}
              onClick={(e) => {
                if (onToggleReminder) {
                  e.stopPropagation();
                  onToggleReminder(contest.id);
                }
              }}
            >
              <Bell size={8} /> 5m Alert
            </span>
          )}
          {autoRemoveDays !== undefined && autoRemoveDays !== null && !isCompleted && (
            <span
              className="status-tag auto-remove-pill mono"
              title="Auto-removes in 7 days if not marked completed"
              data-testid={`auto-remove-${contest.id}`}
            >
              <Clock size={8} /> Auto-removes in {autoRemoveDays}d
            </span>
          )}
          {isCompleted && (
            <span className="status-tag user-completed" data-testid="completed-badge">
              <CheckCircle2 size={9} /> Completed
            </span>
          )}
          {onUpdateQuestions && (
            <div
              className={`questions-solved-ctrl ${questionsSolved > 0 ? 'has-solved' : ''}`}
              title="Number of questions finished in this contest"
              data-testid={`questions-ctrl-${contest.id}`}
              onClick={(e) => e.stopPropagation()}
            >
              <span className="questions-label">🎯 Solved:</span>
              <button
                type="button"
                className="questions-step-btn minus"
                onClick={(e) => {
                  e.stopPropagation();
                  onUpdateQuestions(contest.id, Math.max(0, (questionsSolved || 0) - 1));
                }}
                disabled={(questionsSolved || 0) <= 0}
                aria-label={`Decrease questions solved for ${contest.name}`}
                title="Decrease questions solved"
                data-testid={`questions-dec-${contest.id}`}
              >
                −
              </button>
              <input
                type="number"
                min="0"
                max="99"
                className="questions-input mono"
                value={questionsSolved || 0}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  onUpdateQuestions(contest.id, isNaN(val) ? 0 : Math.max(0, Math.min(99, val)));
                }}
                onClick={(e) => e.stopPropagation()}
                aria-label={`Questions solved for ${contest.name}`}
                data-testid={`questions-input-${contest.id}`}
              />
              <button
                type="button"
                className="questions-step-btn plus"
                onClick={(e) => {
                  e.stopPropagation();
                  onUpdateQuestions(contest.id, (questionsSolved || 0) + 1);
                }}
                aria-label={`Increase questions solved for ${contest.name}`}
                title="Increase questions solved"
                data-testid={`questions-inc-${contest.id}`}
              >
                +
              </button>
            </div>
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
