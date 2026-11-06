import React, { useEffect } from 'react';
import { X, Eye, Users, Calendar, TrendingUp, RefreshCw, BarChart2, ShieldCheck } from 'lucide-react';
import { AnalyticsData } from '../types/contest';

interface AnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  analytics: AnalyticsData | null;
  isLoading: boolean;
  onRefresh: () => void;
}

export const AnalyticsModal: React.FC<AnalyticsModalProps> = ({
  isOpen,
  onClose,
  analytics,
  isLoading,
  onRefresh,
}) => {
  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const totalVisits = analytics?.total_visits ?? 0;
  const activeThisMonth = analytics?.active_this_month ?? 0;
  const activePast7Days = analytics?.active_past_7_days ?? 0;
  const todayVisits = analytics?.today_visits ?? 0;
  const todayStudents = analytics?.today_unique_students ?? 0;
  const currentMonthName = analytics?.current_month_name ?? 'This Month';
  const history = analytics?.monthly_history ?? [];

  return (
    <div
      className="analytics-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Student Usage and Website Visits Analytics"
      onClick={onClose}
    >
      <div
        className="analytics-modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="analytics-modal-header">
          <div className="modal-title-group">
            <div className="modal-icon-badge">
              <BarChart2 size={16} />
            </div>
            <div>
              <h2 className="modal-title">Student Usage & Website Visits</h2>
              <p className="modal-subtitle">
                Real-time traffic and monthly student participation metrics
              </p>
            </div>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close analytics modal"
          >
            <X size={16} />
          </button>
        </div>

        {/* Key Metrics Grid */}
        <div className="analytics-metrics-grid">
          {/* 1. Total Visits */}
          <div className="metric-card highlight-purple">
            <div className="metric-header">
              <span className="metric-label mono">TOTAL WEBSITE VISITS</span>
              <Eye size={14} className="metric-icon" />
            </div>
            <div className="metric-value mono" data-testid="metric-total-visits">
              {totalVisits.toLocaleString()}
            </div>
            <div className="metric-desc">
              Total times anyone opened or refreshed the calendar
            </div>
          </div>

          {/* 2. Monthly Active Students */}
          <div className="metric-card highlight-emerald">
            <div className="metric-header">
              <span className="metric-label mono">ACTIVE THIS MONTH</span>
              <Users size={14} className="metric-icon" />
            </div>
            <div className="metric-value mono" data-testid="metric-monthly-active">
              {activeThisMonth.toLocaleString()}
            </div>
            <div className="metric-desc">
              Unique students who opened at least once in {currentMonthName}
            </div>
          </div>

          {/* 3. Weekly Active Students */}
          <div className="metric-card">
            <div className="metric-header">
              <span className="metric-label mono">PAST 7 DAYS</span>
              <Calendar size={14} className="metric-icon" />
            </div>
            <div className="metric-value mono" data-testid="metric-weekly-active">
              {activePast7Days.toLocaleString()}
            </div>
            <div className="metric-desc">
              Unique students active over the past week
            </div>
          </div>

          {/* 4. Today's Activity */}
          <div className="metric-card">
            <div className="metric-header">
              <span className="metric-label mono">TODAY'S ACTIVITY</span>
              <TrendingUp size={14} className="metric-icon" />
            </div>
            <div className="metric-value mono" data-testid="metric-today-visits">
              {todayVisits.toLocaleString()}
            </div>
            <div className="metric-desc">
              {todayStudents} unique student{todayStudents === 1 ? '' : 's'} visited today
            </div>
          </div>
        </div>

        {/* Monthly Breakdown Table */}
        <div className="analytics-history-section">
          <div className="history-header-row">
            <h3 className="history-title">Monthly Student Engagement History</h3>
            <span className="history-badge mono">Opens at least once / mo</span>
          </div>

          <div className="history-table-wrap">
            <table className="history-table">
              <thead>
                <tr>
                  <th>Month</th>
                  <th>Unique Students Active</th>
                  <th>Total Visits</th>
                </tr>
              </thead>
              <tbody>
                {history.length > 0 ? (
                  history.map((item) => (
                    <tr key={item.month}>
                      <td className="mono month-cell">{item.month_name || item.month}</td>
                      <td className="mono active-cell">
                        <span className="active-pill">{item.unique_students} students</span>
                      </td>
                      <td className="mono visits-cell">{item.total_visits.toLocaleString()} visits</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="mono month-cell">{currentMonthName}</td>
                    <td className="mono active-cell">
                      <span className="active-pill">{activeThisMonth} students</span>
                    </td>
                    <td className="mono visits-cell">{totalVisits.toLocaleString()} visits</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="analytics-modal-footer">
          <div className="footer-privacy-note">
            <ShieldCheck size={13} className="privacy-icon" />
            <span>Privacy-preserving telemetry &bull; No personal student data is stored</span>
          </div>

          <div className="footer-actions">
            <button
              type="button"
              className="analytics-refresh-btn"
              onClick={onRefresh}
              disabled={isLoading}
              title="Refresh statistics"
            >
              <RefreshCw size={12} className={isLoading ? 'spin-icon' : ''} />
              <span>{isLoading ? 'Updating...' : 'Refresh Stats'}</span>
            </button>
            <button
              type="button"
              className="analytics-close-btn"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
