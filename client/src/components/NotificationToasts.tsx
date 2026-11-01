import React from 'react';
import { CheckCircle, AlertTriangle, Info, XCircle, X } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import type { Notification } from '../context/AppContext';

const ICONS: Record<Notification['type'], React.ReactNode> = {
  success: <CheckCircle className="w-4 h-4 text-status-success flex-shrink-0 mt-0.5" />,
  warning: <AlertTriangle className="w-4 h-4 text-status-warning flex-shrink-0 mt-0.5" />,
  error: <XCircle className="w-4 h-4 text-status-error flex-shrink-0 mt-0.5" />,
  info: <Info className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />,
};

export default function NotificationToasts() {
  const { state, dismissNotification } = useAppContext();
  const { notifications } = state;

  if (!notifications.length) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {notifications.map((n) => (
        <div
          key={n.id}
          className="flex items-start gap-2.5 bg-surface-50 border border-border rounded-lg px-3.5 py-2.5 shadow-dropdown pointer-events-auto animate-fade-in text-xs text-text-primary"
          id={`toast-${n.id}`}
        >
          {ICONS[n.type]}
          <span className="flex-1 leading-snug">{n.message}</span>
          <button
            onClick={() => dismissNotification(n.id)}
            className="text-text-muted hover:text-text-primary p-0.5 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
