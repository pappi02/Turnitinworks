import { store } from "../store/store";
import {
  addNotification,
  markAsRead,
  markAllAsRead,
  removeNotification,
  clearNotifications,
} from "../store/slices/notificationSlice";

/**
 * Notification Service
 * Provides convenience methods for showing notifications throughout the app
 */

export const notificationService = {
  /**
   * Show success notification
   */
  success: (message: string, title?: string, duration = 5000) => {
    store.dispatch(
      addNotification({
        type: "success",
        message,
        title,
        duration,
      })
    );
  },

  /**
   * Show error notification
   */
  error: (message: string, title?: string, duration = 5000) => {
    store.dispatch(
      addNotification({
        type: "error",
        message,
        title: title || "Error",
        duration,
      })
    );
  },

  /**
   * Show warning notification
   */
  warning: (message: string, title?: string, duration = 5000) => {
    store.dispatch(
      addNotification({
        type: "warning",
        message,
        title,
        duration,
      })
    );
  },

  /**
   * Show info notification
   */
  info: (message: string, title?: string, duration = 5000) => {
    store.dispatch(
      addNotification({
        type: "info",
        message,
        title,
        duration,
      })
    );
  },

  /**
   * Show notification with action button
   */
  withAction: (
    type: "success" | "error" | "warning" | "info",
    message: string,
    actionLabel: string,
    onAction: () => void,
    title?: string,
    duration = 5000
  ) => {
    store.dispatch(
      addNotification({
        type,
        message,
        title,
        duration,
        action: {
          label: actionLabel,
          onClick: onAction,
        },
      })
    );
  },

  /**
   * Mark notification as read
   */
  markAsRead: (id: string) => {
    store.dispatch(markAsRead(id));
  },

  /**
   * Mark all notifications as read
   */
  markAllAsRead: () => {
    store.dispatch(markAllAsRead());
  },

  /**
   * Remove notification
   */
  remove: (id: string) => {
    store.dispatch(removeNotification(id));
  },

  /**
   * Clear all notifications
   */
  clearAll: () => {
    store.dispatch(clearNotifications());
  },
};

/**
 * API Response Notification Helpers
 */

export const apiNotifications = {
  /**
   * Handle API success response
   */
  handleSuccess: (message?: string, title = "Success") => {
    notificationService.success(
      message || "Operation completed successfully",
      title
    );
  },

  /**
   * Handle API error response
   */
  handleError: (error: any, title = "Error") => {
    let message = "An error occurred";

    if (typeof error === "string") {
      message = error;
    } else if (error?.response?.data?.detail) {
      message = error.response.data.detail;
    } else if (error?.response?.data?.message) {
      message = error.response.data.message;
    } else if (error?.message) {
      message = error.message;
    }

    notificationService.error(message, title);
  },

  /**
   * Handle API errors with field-specific messages
   */
  handleValidationError: (error: any, title = "Validation Error") => {
    if (error?.response?.data?.errors) {
      const errors = error.response.data.errors;
      Object.entries(errors).forEach(([field, messages]: [string, any]) => {
        const message = Array.isArray(messages) ? messages[0] : messages;
        notificationService.error(`${field}: ${message}`, title);
      });
    } else {
      apiNotifications.handleError(error, title);
    }
  },

  /**
   * Show submission progress notification
   */
  submissionInProgress: () => {
    notificationService.info(
      "Your submission is being processed...",
      "Processing",
      0 // Don't auto-dismiss
    );
  },

  /**
   * Show upload progress notification
   */
  uploadInProgress: (fileName: string) => {
    notificationService.info(
      `Uploading ${fileName}...`,
      "Upload in Progress",
      0 // Don't auto-dismiss
    );
  },

  /**
   * Show batch operation notification
   */
  batchOperationInProgress: (count: number, action: string) => {
    notificationService.info(
      `Processing ${count} item${count > 1 ? "s" : ""}...`,
      `${action} in Progress`,
      0 // Don't auto-dismiss
    );
  },

  /**
   * Show batch operation complete notification
   */
  batchOperationComplete: (count: number, action: string) => {
    notificationService.success(
      `Successfully ${action} ${count} item${count > 1 ? "s" : ""}`,
      "Operation Complete"
    );
  },

  /**
   * Show export notification
   */
  exportStarted: (format: string) => {
    notificationService.info(
      `Exporting data as ${format.toUpperCase()}...`,
      "Export Started",
      0
    );
  },

  /**
   * Show export complete notification
   */
  exportComplete: (fileName: string) => {
    notificationService.success(
      `${fileName} has been downloaded`,
      "Export Complete"
    );
  },
};

/**
 * Permission-based notifications
 */
export const permissionNotifications = {
  /**
   * Show permission denied notification
   */
  denied: (action: string) => {
    notificationService.warning(
      `You don't have permission to ${action}`,
      "Permission Denied"
    );
  },

  /**
   * Show role-based action not available notification
   */
  roleRequired: (requiredRole: string) => {
    notificationService.warning(
      `This action requires ${requiredRole} role`,
      "Insufficient Permissions"
    );
  },

  /**
   * Show session expired notification
   */
  sessionExpired: () => {
    notificationService.withAction(
      "warning",
      "Your session has expired. Please log in again.",
      "Log In",
      () => {
        window.location.href = "/login";
      },
      "Session Expired",
      0 // Don't auto-dismiss
    );
  },

  /**
   * Show unauthorized access notification
   */
  unauthorized: () => {
    notificationService.withAction(
      "error",
      "You are not authorized to access this resource.",
      "Go Home",
      () => {
        window.location.href = "/";
      },
      "Unauthorized",
      0 // Don't auto-dismiss
    );
  },
};

/**
 * Task-specific notifications
 */
export const taskNotifications = {
  /**
   * Show task completed notification
   */
  taskCompleted: (taskName: string) => {
    notificationService.success(
      `${taskName} has been completed`,
      "Task Complete"
    );
  },

  /**
   * Show task failed notification
   */
  taskFailed: (taskName: string, reason?: string) => {
    notificationService.error(
      reason ? `${taskName} failed: ${reason}` : `${taskName} failed`,
      "Task Failed"
    );
  },

  /**
   * Show report analysis complete notification
   */
  reportReady: (studentName: string) => {
    notificationService.success(
      `Report for ${studentName} is ready for review`,
      "Report Ready",
      0
    );
  },

  /**
   * Show high similarity warning
   */
  highSimilarity: (studentName: string, similarity: number) => {
    notificationService.withAction(
      "warning",
      `${studentName}'s submission has ${similarity}% similarity`,
      "Review Report",
      () => {
        // Navigate to report in actual implementation
      },
      "High Similarity Detected",
      0
    );
  },

  /**
   * Show rate limit notification
   */
  rateLimitWarning: () => {
    notificationService.warning(
      "You are approaching your API rate limit. Please try again in a few moments.",
      "Rate Limit Warning"
    );
  },
};
