import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { v4 as uuidv4 } from "uuid";

export interface Notification {
  id: string;
  type: "success" | "error" | "warning" | "info";
  message: string;
  title?: string;
  duration?: number;
  timestamp: Date;
  read: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface NotificationState {
  items: Notification[];
  all: Notification[];
  unreadCount: number;
}

const initialState: NotificationState = {
  items: [],
  all: [],
  unreadCount: 0,
};

export const notificationSlice = createSlice({
  name: "notifications",
  initialState,
  reducers: {
    /**
     * Add a new notification
     */
    addNotification: (
      state,
      action: PayloadAction<Omit<Notification, "id" | "timestamp" | "read">>
    ) => {
      const notification: Notification = {
        ...action.payload,
        id: uuidv4(),
        timestamp: new Date(),
        read: false,
      };

      state.items.push(notification);
      state.all.push(notification);
      state.unreadCount += 1;

      // Auto-remove after duration
      if (notification.duration !== 0) {
        const duration = notification.duration || 5000;
        setTimeout(() => {
          // Note: In a real app, dispatch removeNotification here
        }, duration);
      }
    },

    /**
     * Remove notification by ID
     */
    removeNotification: (state, action: PayloadAction<string>) => {
      const notification = state.items.find((n) => n.id === action.payload);

      if (notification && !notification.read) {
        state.unreadCount = Math.max(0, state.unreadCount - 1);
      }

      state.items = state.items.filter((n) => n.id !== action.payload);
    },

    /**
     * Mark notification as read
     */
    markAsRead: (state, action: PayloadAction<string>) => {
      const notification = state.all.find((n) => n.id === action.payload);

      if (notification && !notification.read) {
        notification.read = true;
        state.unreadCount = Math.max(0, state.unreadCount - 1);
      }
    },

    /**
     * Mark all notifications as read
     */
    markAllAsRead: (state) => {
      state.all.forEach((notification) => {
        notification.read = true;
      });
      state.unreadCount = 0;
    },

    /**
     * Clear all notifications
     */
    clearNotifications: (state) => {
      state.items = [];
      state.all = [];
      state.unreadCount = 0;
    },

    /**
     * Clear only read notifications
     */
    clearReadNotifications: (state) => {
      state.items = state.items.filter((n) => !n.read);
      state.all = state.all.filter((n) => !n.read);
    },

    /**
     * Update notification
     */
    updateNotification: (
      state,
      action: PayloadAction<{
        id: string;
        changes: Partial<Notification>;
      }>
    ) => {
      const notification = state.all.find((n) => n.id === action.payload.id);

      if (notification) {
        Object.assign(notification, action.payload.changes);

        // Update in items array too
        const itemIndex = state.items.findIndex(
          (n) => n.id === action.payload.id
        );
        if (itemIndex !== -1) {
          Object.assign(state.items[itemIndex], action.payload.changes);
        }
      }
    },
  },
});

export const {
  addNotification,
  removeNotification,
  markAsRead,
  markAllAsRead,
  clearNotifications,
  clearReadNotifications,
  updateNotification,
} = notificationSlice.actions;

export default notificationSlice.reducer;
