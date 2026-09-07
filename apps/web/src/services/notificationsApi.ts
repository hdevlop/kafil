import { api } from "@/services/http";
import type {
  NotificationListQuery,
  NotificationListResult,
  NotificationLocale,
  NotificationRecord,
  PushConfig,
} from "@/features/Notifications/types";

export function listNotifications(query: NotificationListQuery) {
  return api.get<NotificationListResult>("/notifications", {
    query: {
      cursor: query.cursor,
      limit: query.limit,
      unread: query.unread,
      topic: query.topic,
    },
  });
}

export function getUnreadCount() {
  return api.get<{ count: number }>("/notifications/unread-count");
}

export function markNotificationRead(id: string) {
  return api.patch<NotificationRecord>(`/notifications/${id}/read`);
}

export function markAllNotificationsRead() {
  return api.patch<{ read: number }>("/notifications/read-all");
}

export function getNotificationSettings() {
  return api.get<{ locale: NotificationLocale }>("/notifications/settings");
}

export function updateNotificationSettings(locale: NotificationLocale) {
  return api.put<{ locale: NotificationLocale }>("/notifications/settings", {
    locale,
  });
}

export function getPushConfig() {
  return api.get<PushConfig>("/notifications/push-config");
}

export function subscribePush(input: {
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgentFamily?: string;
}) {
  return api.post<{ id: string; endpointFingerprint: string; createdAt: string }>(
    "/notifications/push-subscriptions",
    input,
  );
}

export function unsubscribePush(endpoint: string) {
  return api.delete<{ removed: boolean }>("/notifications/push-subscriptions", {
    endpoint,
  });
}
