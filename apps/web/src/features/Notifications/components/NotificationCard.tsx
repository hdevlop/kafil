"use client";

import { useRouter } from "next/navigation";
import { NNotifyItem } from "najm-kit";
import { useTranslation } from "najm-i18n/react";

import { useMarkNotificationRead } from "../hooks/useNotificationCommands";
import { useNotifyLabels } from "../hooks/useNotifyLabels";
import { buildNotifyItem } from "../lib/buildNotifyItem";
import { normalizeLocale } from "../lib/buildNotificationViewModel";
import type { NotificationRecord } from "../types";

/**
 * One inbox row: the Kit presentation plus the Kafil topic mapping and the
 * read-then-navigate rule. A rejected read never navigates — the shared
 * command hook has already presented it.
 */
export function NotificationCard({
  notification,
}: Readonly<{ notification: NotificationRecord }>) {
  const { t, language } = useTranslation();
  const router = useRouter();
  const markRead = useMarkNotificationRead();
  const labels = useNotifyLabels();
  const item = buildNotifyItem(notification, language, {
    unknownTitle: t("notifications.unknownTitle"),
    unknownBody: t("notifications.unknownBody"),
  });

  return (
    <NNotifyItem
      item={item}
      labels={labels}
      locale={normalizeLocale(language ?? notification.locale)}
      onError={() => undefined}
      onMarkRead={(id) => markRead.mutateAsync(id)}
      onOpenItem={(opened) => {
        if (opened.href) router.push(opened.href);
      }}
      pending={markRead.isPending && markRead.variables === notification.id}
    />
  );
}
