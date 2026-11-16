import React from 'react';
import { Bell, ExternalLink, X } from 'lucide-react';
import { ContestNotificationToast } from '../hooks/useContestNotifications';

interface NotificationToastProps {
  toast: ContestNotificationToast | null;
  onDismiss: () => void;
}

export const NotificationToast: React.FC<NotificationToastProps> = ({ toast, onDismiss }) => {
  if (!toast) return null;

  return (
    <div
      className="contest-notif-toast"
      role="alert"
      aria-live="assertive"
      data-testid="contest-notification-toast"
    >
      <div className="notif-toast-icon-wrap" aria-hidden="true">
        <span className="notif-toast-ping" />
        <Bell size={18} className="notif-toast-bell" />
      </div>

      <div className="notif-toast-body">
        <div className="notif-toast-badge-row">
          <span className="notif-toast-kicker mono">STARTS IN 5 MINUTES</span>
          <span className={`platform-pill ${toast.platform}`}>{toast.platform}</span>
        </div>
        <h4 className="notif-toast-title" title={toast.name}>
          {toast.name}
        </h4>
        <div className="notif-toast-actions">
          <a
            href={toast.url}
            target="_blank"
            rel="noopener noreferrer"
            className="notif-toast-action-btn"
            onClick={onDismiss}
          >
            <span>Join Contest</span>
            <ExternalLink size={11} />
          </a>
          <button
            type="button"
            className="notif-toast-dismiss-text-btn"
            onClick={onDismiss}
          >
            Dismiss
          </button>
        </div>
      </div>

      <button
        type="button"
        className="notif-toast-close-btn"
        onClick={onDismiss}
        aria-label="Close notification"
      >
        <X size={14} />
      </button>
    </div>
  );
};
