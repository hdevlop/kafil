"use client";

import { useEntityCommand } from "@/hooks/useEntityCommand";
import {
  markAllNotificationsRead,
  markNotificationRead,
  subscribePush,
  unsubscribePush,
  updateNotificationSettings,
} from "@/services/notificationsApi";

import { notificationKeys } from "./notificationKeys";
import type { NotificationLocale } from "../types";

const INVALIDATE_ALL = [
  notificationKeys.all,
  notificationKeys.unreadCount(),
];

export function useMarkNotificationRead() {
  return useEntityCommand({
    mutationFn: (id: string) => markNotificationRead(id),
    invalidate: INVALIDATE_ALL,
  });
}

export function useMarkAllNotificationsRead() {
  return useEntityCommand({
    mutationFn: () => markAllNotificationsRead(),
    invalidate: INVALIDATE_ALL,
  });
}

export function useUpdateNotificationSettings() {
  return useEntityCommand({
    mutationFn: (locale: NotificationLocale) =>
      updateNotificationSettings(locale),
    invalidate: [notificationKeys.settings()],
  });
}

export function useSubscribePush() {
  return useEntityCommand({
    mutationFn: subscribePush,
    invalidate: [notificationKeys.pushConfig()],
  });
}

export function useUnsubscribePush() {
  return useEntityCommand({
    mutationFn: (endpoint: string) => unsubscribePush(endpoint),
    invalidate: [notificationKeys.pushConfig()],
  });
}
