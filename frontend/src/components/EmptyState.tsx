import React from 'react';
import { CalendarX, SearchX, AlertCircle } from 'lucide-react';

interface EmptyStateProps {
  type: 'no-contests' | 'no-results' | 'error';
  message?: string;
  onRetry?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ type, message, onRetry }) => {
  if (type === 'error') {
    return (
      <div className="state-box" style={{ borderColor: 'var(--status-degraded)' }}>
        <AlertCircle size={32} style={{ color: 'var(--status-degraded)', marginBottom: '0.65rem' }} />
        <h3 className="state-title">Unable to connect to calendar service</h3>
        <p className="state-description">
          {message || 'Could not retrieve contest schedules. Upstream platforms might be temporarily unreachable.'}
        </p>
        {onRetry && (
          <button
            type="button"
            className="state-retry-btn"
            style={{ marginTop: '0.9rem' }}
            onClick={onRetry}
          >
            Retry Connection
          </button>
        )}
      </div>
    );
  }

  if (type === 'no-results') {
    return (
      <div className="state-box">
        <SearchX size={32} style={{ color: 'var(--text-dim)', marginBottom: '0.65rem' }} />
        <h3 className="state-title">No contests match your search</h3>
        <p className="state-description">
          {message || 'Try adjusting your search terms or clearing selected platform filters.'}
        </p>
      </div>
    );
  }

  return (
    <div className="state-box">
      <CalendarX size={32} style={{ color: 'var(--text-dim)', marginBottom: '0.65rem' }} />
      <h3 className="state-title">No contests scheduled</h3>
      <p className="state-description">
        {message || 'There are no contests recorded for this category right now.'}
      </p>
    </div>
  );
};
