import type { NotificationListQuery } from "../types";

export const notificationKeys = {
  all: ["notifications"] as const,
  list: (query: NotificationListQuery) =>
    ["notifications", "list", query] as const,
  unreadCount: () => ["notifications", "unread-count"] as const,
  settings: () => ["notifications", "settings"] as const,
  pushConfig: () => ["notifications", "push-config"] as const,
};
