import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  Bell,
  AlertCircle,
  Info,
  XCircle,
  X,
  CheckCircle2,
} from 'lucide-react';
import { removeNotification } from '../store/slices/notificationSlice';

interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  title?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

/**
 * Notification Center Component
 * Displays toast notifications in the top-right corner
 */
export const NotificationCenter = () => {
  const dispatch = useDispatch();
  const notifications = useSelector((state: any) => state.notifications?.items || []);

  const getIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-orange-600" />;
      case 'info':
      default:
        return <Info className="w-5 h-5 text-blue-600" />;
    }
  };

  const getStyles = (type: string) => {
    switch (type) {
      case 'success':
        return {
          bg: 'bg-green-50',
          border: 'border-green-200',
          text: 'text-green-900',
        };
      case 'error':
        return {
          bg: 'bg-red-50',
          border: 'border-red-200',
          text: 'text-red-900',
        };
      case 'warning':
        return {
          bg: 'bg-orange-50',
          border: 'border-orange-200',
          text: 'text-orange-900',
        };
      case 'info':
      default:
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          text: 'text-blue-900',
        };
    }
  };

  return (
    <div className="fixed top-6 right-6 z-50 flex flex-col gap-3 pointer-events-none">
      {notifications.map((notification: Notification) => (
        <NotificationToast
          key={notification.id}
          notification={notification}
          onClose={() => dispatch(removeNotification(notification.id))}
          getIcon={getIcon}
          getStyles={getStyles}
        />
      ))}
    </div>
  );
};

/**
 * Individual Notification Toast
 */
interface NotificationToastProps {
  notification: Notification;
  onClose: () => void;
  getIcon: (type: string) => React.ReactNode;
  getStyles: (type: string) => { bg: string; border: string; text: string };
}

const NotificationToast = ({
  notification,
  onClose,
  getIcon,
  getStyles,
}: NotificationToastProps) => {
  const styles = getStyles(notification.type);

  useEffect(() => {
    const duration = notification.duration || 5000;
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [notification.id, notification.duration, onClose]);

  return (
    <div
      className={`${styles.bg} ${styles.border} border pointer-events-auto rounded-lg shadow-lg overflow-hidden animate-in slide-in-from-right-5 fade-in-0 duration-200`}
    >
      <div className="flex items-start gap-3 p-4">
        {/* Icon */}
        <div className="flex-shrink-0 mt-0.5">{getIcon(notification.type)}</div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {notification.title && (
            <p className={`font-semibold ${styles.text}`}>{notification.title}</p>
          )}
          <p
            className={`text-sm ${
              notification.title ? 'text-gray-700 mt-1' : styles.text
            }`}
          >
            {notification.message}
          </p>

          {/* Action Button */}
          {notification.action && (
            <button
              onClick={() => {
                notification.action?.onClick();
                onClose();
              }}
              className="mt-2 text-sm font-semibold text-blue-600 hover:text-blue-700 underline"
            >
              {notification.action.label}
            </button>
          )}
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className={`flex-shrink-0 ${styles.text} opacity-70 hover:opacity-100 transition-opacity`}
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

/**
 * Unread Notification Badge
 */
interface NotificationBadgeProps {
  onClick?: () => void;
}

export const NotificationBadge = ({ onClick }: NotificationBadgeProps) => {
  const unreadCount = useSelector(
    (state: any) => state.notifications?.unreadCount || 0
  );

  return (
    <button
      onClick={onClick}
      className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
    >
      <Bell className="w-6 h-6" />
      {unreadCount > 0 && (
        <span className="absolute top-1 right-1 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-600 rounded-full">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </button>
  );
};

/**
 * Notification Panel (for detailed view)
 */
interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationPanel = ({ isOpen, onClose }: NotificationPanelProps) => {
  const dispatch = useDispatch();
  const notifications = useSelector((state: any) => state.notifications?.all || []);

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed top-16 right-6 w-96 max-h-96 bg-white rounded-lg shadow-xl z-50 overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Notifications</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="divide-y">
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              <Info className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No notifications</p>
            </div>
          ) : (
            notifications.map((notification: any) => (
              <div
                key={notification.id}
                className={`p-4 hover:bg-gray-50 transition-colors ${
                  !notification.read ? 'bg-blue-50' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-1">
                    {!notification.read && (
                      <div className="w-2 h-2 bg-blue-600 rounded-full" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    {notification.title && (
                      <p className="font-semibold text-gray-900">
                        {notification.title}
                      </p>
                    )}
                    <p className="text-sm text-gray-700">
                      {notification.message}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatTime(notification.timestamp)}
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      dispatch(removeNotification(notification.id))
                    }
                    className="flex-shrink-0 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="sticky bottom-0 bg-gray-50 border-t p-4">
            <button className="w-full px-4 py-2 text-sm font-semibold text-blue-600 hover:text-blue-700">
              Clear All
            </button>
          </div>
        )}
      </div>
    </>
  );
};

/**
 * Helper function to format time
 */
function formatTime(timestamp: number): string {
  const date = new Date(timestamp); // Convert from Unix timestamp to Date
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString();
}
