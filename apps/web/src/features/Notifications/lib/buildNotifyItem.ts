import type { NNotifyItemData } from "najm-kit";

import {
  buildNotificationViewModel,
  normalizeLocale,
} from "./buildNotificationViewModel";
import type { NotificationRecord } from "../types";

export interface NotificationFallbackCopy {
  unknownTitle: string;
  unknownBody: string;
}

/**
 * Kafil record to the presentation-only row Najm Kit renders.
 *
 * The topic registry, the unknown-topic safety, and the internal destination
 * stay here: the package never sees a topic, a payload, or a route.
 */
export function buildNotifyItem(
  notification: NotificationRecord,
  language: string | null | undefined,
  fallback: NotificationFallbackCopy,
): NNotifyItemData {
  const locale = normalizeLocale(language ?? notification.locale);
  const vm = buildNotificationViewModel(notification.topic, locale, fallback);
  return {
    id: notification.id,
    title: vm.title,
    body: vm.body,
    href: `${vm.href}?focus=${notification.id}`,
    read: notification.readAt !== null,
    createdAt: notification.createdAt,
    icon: vm.icon,
    tone: vm.token,
  };
}
