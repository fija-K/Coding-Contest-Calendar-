import React from 'react';
import { RefreshCw, AlertCircle } from 'lucide-react';
import { PlatformStatus } from '../types/contest';
import { formatDateTime } from '../utils/date';

interface FreshnessBannerProps {
  statuses: PlatformStatus[];
  isRefreshing: boolean;
  onRefresh: () => void;
  timezone: string;
}

export const FreshnessBanner: React.FC<FreshnessBannerProps> = ({
  statuses,
  isRefreshing,
  onRefresh,
  timezone,
}) => {
  // Find the latest successful refresh across all platforms
  const latestSuccess = statuses
    .map((s) => s.last_successful_refresh)
    .filter(Boolean)
    .sort()
    .reverse()[0];

  const degradedSources = statuses.filter(
    (s) => s.health === 'degraded' || s.health === 'error'
  );
  const hasDegraded = degradedSources.length > 0;

  return (
    <div className="freshness-status-line" role="status" aria-label="Data freshness and source health">
      <div className="freshness-meta-group">
        <span className="freshness-timestamp">
          Synced: <span className="mono">{latestSuccess ? formatDateTime(latestSuccess, timezone) : 'Just now'}</span>
        </span>
        <span className="status-separator" aria-hidden="true">•</span>
        <div className="platform-health-pills" role="list" aria-label="Platform source health">
          {statuses.map((s) => {
            const isDegraded = s.health === 'degraded' || s.health === 'error';
            return (
              <span
                key={s.platform}
                role="listitem"
                className={`platform-health-pill ${isDegraded ? 'degraded' : 'healthy'}`}
                title={`${s.name}: ${s.health.toUpperCase()}${s.latest_error ? ` (${s.latest_error})` : ''} - ${s.contest_count} contests cached`}
              >
                <span className={`status-dot ${isDegraded ? 'degraded' : 'healthy'}`} aria-hidden="true" />
                <span className="health-name">{s.name}</span>
              </span>
            );
          })}
        </div>
      </div>

      <div className="freshness-action-group">
        {hasDegraded && (
          <span className="degraded-notice" role="alert">
            <AlertCircle size={11} />
            <span>Upstream degraded; using cache</span>
          </span>
        )}
        <button
          type="button"
          className="sync-action-btn"
          onClick={onRefresh}
          disabled={isRefreshing}
          title="Synchronize contest feeds from upstream platforms"
          aria-label="Refresh contest data"
        >
          <RefreshCw size={11} className={isRefreshing ? 'spin-active' : ''} />
          <span>{isRefreshing ? 'Syncing…' : 'Sync'}</span>
        </button>
      </div>
    </div>
  );
};
