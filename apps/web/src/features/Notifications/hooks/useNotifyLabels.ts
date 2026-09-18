"use client";

import { useMemo } from "react";
import type { NNotifyLabels } from "najm-kit";
import { useTranslation } from "najm-i18n/react";

/** The Kafil catalog, in the shape Najm Kit's notification menu asks for. */
export function useNotifyLabels(): NNotifyLabels {
  const { t } = useTranslation();

  return useMemo<NNotifyLabels>(
    () => ({
      open: t("notifications.openInbox"),
      unread: (count: number) => t("notifications.unreadBadge", { count }),
      title: t("notifications.inboxTitle"),
      loading: t("notifications.loading"),
      emptyTitle: t("notifications.emptyTitle"),
      emptyDescription: t("notifications.emptyBody"),
      errorTitle: t("notifications.loadError"),
      retry: t("notifications.retry"),
      markRead: t("notifications.markRead"),
      markingRead: t("notifications.marking"),
      markAllRead: t("notifications.markAllRead"),
      markingAll: t("notifications.markingAll"),
      view: t("common.view"),
      viewAll: t("notifications.viewAll"),
      unreadState: t("notifications.stateUnread"),
      justNow: t("notifications.justNow"),
    }),
    [t],
  );
}
