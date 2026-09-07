"use client";

import { useEntityQuery, type EntityQueryOptions } from "@/hooks/useEntityQuery";
import {
  getPushConfig,
  getUnreadCount,
  listNotifications,
} from "@/services/notificationsApi";

import { notificationKeys } from "./notificationKeys";
import type {
  NotificationListQuery,
  NotificationListResult,
} from "../types";

export function useNotifications(
  query: NotificationListQuery,
  options: Partial<EntityQueryOptions<NotificationListResult>> = {},
) {
  return useEntityQuery<NotificationListResult>({
    queryKey: notificationKeys.list(query),
    queryFn: () => listNotifications(query),
    ...options,
  });
}

/**
 * The unread-count query alone polls every 30 seconds. List queries refetch
 * on bell open, page entry, and command invalidation only.
 */
export function useUnreadCount(
  options: Partial<EntityQueryOptions<{ count: number }>> = {},
) {
  return useEntityQuery<{ count: number }>({
    queryKey: notificationKeys.unreadCount(),
    queryFn: getUnreadCount,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
    ...options,
  });
}

export function usePushConfig(
  options: Partial<EntityQueryOptions<Awaited<ReturnType<typeof getPushConfig>>>> = {},
) {
  return useEntityQuery({
    queryKey: notificationKeys.pushConfig(),
    queryFn: getPushConfig,
    staleTime: 5 * 60_000,
    ...options,
  });
}
