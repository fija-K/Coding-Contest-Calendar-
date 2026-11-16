import React, { useState } from 'react';
import { Bell, BellRing, BellOff, Volume2, VolumeX, CheckCircle2, AlertCircle, X, Sparkles } from 'lucide-react';

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  enabled: boolean;
  permission: NotificationPermission;
  soundEnabled: boolean;
  onToggleEnabled: () => Promise<void>;
  onToggleSound: () => void;
  onSendTest: () => Promise<void>;
}

export const NotificationModal: React.FC<NotificationModalProps> = ({
  isOpen,
  onClose,
  enabled,
  permission,
  soundEnabled,
  onToggleEnabled,
  onToggleSound,
  onSendTest,
}) => {
  const [testSent, setTestSent] = useState(false);

  if (!isOpen) return null;

  const handleTestClick = async () => {
    setTestSent(true);
    await onSendTest();
    setTimeout(() => setTestSent(false), 3000);
  };

  const isGranted = permission === 'granted';
  const isDenied = permission === 'denied';

  return (
    <div
      className="notif-modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="notif-modal-title"
      data-testid="notification-modal"
    >
      <div className="notif-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="notif-modal-header">
          <div className="notif-modal-title-group">
            <div className="notif-modal-icon-badge" aria-hidden="true">
              <BellRing size={16} />
            </div>
            <div>
              <h3 id="notif-modal-title" className="notif-modal-title">
                Contest Reminders
              </h3>
              <p className="notif-modal-subtitle">
                Get notified 5 minutes before contests start so you never miss a round.
              </p>
            </div>
          </div>
          <button
            type="button"
            className="notif-modal-close-btn"
            onClick={onClose}
            aria-label="Close reminder settings"
          >
            <X size={16} />
          </button>
        </div>

        {/* Current Status Pill */}
        <div className="notif-modal-status-card">
          <div className="notif-status-indicator">
            {enabled && isGranted ? (
              <CheckCircle2 size={16} className="notif-status-icon active" />
            ) : enabled && isDenied ? (
              <AlertCircle size={16} className="notif-status-icon warning" />
            ) : enabled ? (
              <Bell size={16} className="notif-status-icon pending" />
            ) : (
              <BellOff size={16} className="notif-status-icon paused" />
            )}
            <div className="notif-status-details">
              <span className="notif-status-label">
                {enabled && isGranted
                  ? 'Push Notifications Active'
                  : enabled && isDenied
                  ? 'In-App Alerts Active (Browser Push Blocked)'
                  : enabled
                  ? '5-Minute Reminders Ready'
                  : 'Contest Reminders Paused'}
              </span>
              <span className="notif-status-subtext">
                {enabled && isGranted
                  ? 'Desktop & mobile system alerts will ring 5 min before start.'
                  : enabled && isDenied
                  ? 'Unblock notifications in browser address bar for background alerts.'
                  : enabled
                  ? 'Click "Enable" to authorize browser system notifications.'
                  : 'Turn on below to receive 5-minute pre-contest alerts.'}
              </span>
            </div>
          </div>
        </div>

        {/* Setting Toggles */}
        <div className="notif-modal-toggles">
          {/* Master 5-Minute Toggle */}
          <div className="notif-toggle-row">
            <div className="notif-toggle-label-wrap">
              <div className="notif-toggle-title">
                <span>5-Minute Start Reminders</span>
                <span className="notif-time-badge mono">5m</span>
              </div>
              <span className="notif-toggle-desc">
                Receive an alert 5 minutes before any scheduled contest begins.
              </span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={enabled}
              className={`notif-switch-btn ${enabled ? 'active' : ''}`}
              onClick={onToggleEnabled}
              data-testid="toggle-notif-switch"
            >
              <span className="notif-switch-slider" />
            </button>
          </div>

          {/* Sound Alert Toggle */}
          <div className="notif-toggle-row">
            <div className="notif-toggle-label-wrap">
              <div className="notif-toggle-title">
                <span>Audio Reminder Chime</span>
                {soundEnabled ? <Volume2 size={13} className="notif-sound-icon" /> : <VolumeX size={13} className="notif-sound-icon muted" />}
              </div>
              <span className="notif-toggle-desc">
                Plays a soft, pleasant two-tone crystal chime when the alert fires.
              </span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={soundEnabled}
              className={`notif-switch-btn ${soundEnabled ? 'active' : ''}`}
              onClick={onToggleSound}
              data-testid="toggle-sound-switch"
            >
              <span className="notif-switch-slider" />
            </button>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="notif-modal-footer">
          <button
            type="button"
            className="notif-test-btn"
            onClick={handleTestClick}
            data-testid="test-notification-btn"
          >
            <Sparkles size={13} />
            <span>{testSent ? 'Alert Sent! Check screen & sound' : 'Send Test Notification'}</span>
          </button>
          <button
            type="button"
            className="notif-modal-done-btn"
            onClick={onClose}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
