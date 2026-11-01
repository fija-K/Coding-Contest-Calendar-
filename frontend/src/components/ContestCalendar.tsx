import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, CheckCircle2, Circle } from 'lucide-react';
import { Contest } from '../types/contest';
import { formatDateOnly, formatTimeOnly } from '../utils/date';

interface ContestCalendarProps {
  contests: Contest[];
  timezone: string;
  isCompleted?: (contestId: string) => boolean;
  onToggleComplete?: (contestId: string) => void;
}

export const ContestCalendar: React.FC<ContestCalendarProps> = ({
  contests,
  timezone,
  isCompleted = () => false,
  onToggleComplete,
}) => {
  const [currentDate, setCurrentDate] = useState(() => new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const setToday = () => {
    setCurrentDate(new Date());
  };

  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Map contests to date keys in the user's selected timezone
  const contestsByDate: Record<string, Contest[]> = {};

  contests.forEach((c) => {
    const key = formatDateOnly(c.start_time, timezone);
    if (!contestsByDate[key]) {
      contestsByDate[key] = [];
    }
    contestsByDate[key].push(c);
  });

  const calendarCells = [];
  // Empty padding cells for preceding month
  for (let i = 0; i < firstDayOfMonth; i++) {
    calendarCells.push(
      <div key={`empty-${i}`} className="calendar-day-slot off-month" aria-hidden="true" />
    );
  }

  const todayStr = formatDateOnly(new Date().toISOString(), timezone);

  for (let day = 1; day <= daysInMonth; day++) {
    const dayDate = new Date(year, month, day);
    const dayKey = formatDateOnly(dayDate.toISOString(), timezone);
    const dayContests = contestsByDate[dayKey] || [];
    const isToday = dayKey === todayStr;

    calendarCells.push(
      <div
        key={`day-${day}`}
        className={`calendar-day-slot ${isToday ? 'current-day' : ''}`}
        aria-label={`${monthName} ${day}`}
      >
        <span className="calendar-date-number mono">{day}</span>
        <div className="calendar-day-events">
          {dayContests.map((c) => {
            const completed = isCompleted(c.id);
            return (
              <div
                key={c.id}
                className={`calendar-chip-row ${completed ? 'is-completed' : ''}`}
                data-testid={`calendar-item-${c.id}`}
              >
                {onToggleComplete && (
                  <button
                    type="button"
                    className={`calendar-toggle-btn ${completed ? 'completed' : ''}`}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onToggleComplete(c.id);
                    }}
                    aria-label={completed ? `Completed: ${c.name}` : `Mark completed: ${c.name}`}
                    title={completed ? 'Completed' : 'Mark completed'}
                    data-testid={`calendar-toggle-${c.id}`}
                  >
                    {completed ? (
                      <CheckCircle2 size={11} className="check-icon-completed" />
                    ) : (
                      <Circle size={11} className="check-icon-uncompleted" />
                    )}
                  </button>
                )}
                <a
                  href={c.contest_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`calendar-chip ${c.platform} ${completed ? 'is-completed' : ''}`}
                  title={`${c.name} (${c.platform})${completed ? ' - Completed' : ''} at ${formatTimeOnly(c.start_time, timezone)}`}
                >
                  <span className="mono calendar-chip-time">
                    {formatTimeOnly(c.start_time, timezone)}
                  </span>{' '}
                  <span className="calendar-chip-title">{c.name}</span>
                </a>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="calendar-panel" role="region" aria-label="Monthly contest calendar">
      <div className="calendar-topbar">
        <h3 className="calendar-month-heading">{monthName}</h3>
        <div className="calendar-controls">
          <button
            type="button"
            className="calendar-nav-btn"
            onClick={prevMonth}
            aria-label="Previous month"
            title="Previous month"
          >
            <ChevronLeft size={13} />
          </button>
          <button
            type="button"
            className="calendar-today-btn"
            onClick={setToday}
          >
            Today
          </button>
          <button
            type="button"
            className="calendar-nav-btn"
            onClick={nextMonth}
            aria-label="Next month"
            title="Next month"
          >
            <ChevronRight size={13} />
          </button>
        </div>
      </div>

      <div className="calendar-matrix" role="grid">
        {weekdays.map((w) => (
          <div key={w} className="calendar-day-header mono" role="columnheader">
            {w}
          </div>
        ))}
        {calendarCells}
      </div>
    </div>
  );
};
