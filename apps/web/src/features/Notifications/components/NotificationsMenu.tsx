"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  NNotifyContent,
  NNotifyFooter,
  NNotifyHeader,
  NNotifyList,
  NNotifyRoot,
  NNotifyTrigger,
  type NNotifyLabels,
} from "najm-kit";
import { useTranslation } from "najm-i18n/react";

import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
} from "../hooks/useNotificationCommands";
import { useNotifications, useUnreadCount } from "../hooks/useNotifications";
import { useNotifyLabels } from "../hooks/useNotifyLabels";
import { buildNotifyItem } from "../lib/buildNotifyItem";
import { normalizeLocale } from "../lib/buildNotificationViewModel";

/**
 * Connected preview.
 *
 * Mounted only while the menu is open, so the list query starts on entry and
 * refetches on every open without touching the global query defaults.
 */
function NotificationsMenuBody({
  labels,
  onClose,
}: Readonly<{ labels: NNotifyLabels; onClose: () => void }>) {
  const { t, language } = useTranslation();
  const router = useRouter();
  const [markAllError, setMarkAllError] = useState<string | null>(null);
  const list = useNotifications({ limit: 5 }, { refetchOnMount: "always" });
  const markAll = useMarkAllNotificationsRead();
  const markRead = useMarkNotificationRead();
  const locale = normalizeLocale(language ?? "en");

  const items = useMemo(
    () =>
      (list.data?.rows ?? []).map((row) =>
        buildNotifyItem(row, language, {
          unknownTitle: t("notifications.unknownTitle"),
          unknownBody: t("notifications.unknownBody"),
        }),
      ),
    [list.data, language, t],
  );

  return (
    <>
      <NNotifyHeader
        markAllLabel={labels.markAllRead}
        markAllPending={markAll.isPending}
        markingAllLabel={labels.markingAll}
        onError={(error) =>
          setMarkAllError(
            error instanceof Error ? error.message : t("notifications.loadError"),
          )
        }
        onMarkAllRead={async () => {
          setMarkAllError(null);
          await markAll.mutateAsync();
        }}
        title={labels.title}
      />
      {markAllError ? (
        <p className="px-2 text-sm text-destructive" role="alert">
          {markAllError}
        </p>
      ) : null}
      <NNotifyList
        error={list.isError}
        // Marking one row read from the preview closes the menu, as it has
        // since the first bell: the row it was about is gone from the list.
        itemProps={{ onMarkedRead: onClose }}
        items={items}
        labels={labels}
        loading={list.isPending}
        locale={locale}
        markReadPendingId={markRead.isPending ? markRead.variables ?? null : null}
        onMarkRead={(id) => markRead.mutateAsync(id)}
        onOpenItem={(item) => {
          if (item.href) router.push(item.href);
        }}
        onRetry={() => void list.refetch()}
        // A rejected command is already presented by the shared command hook;
        // swallowing it here keeps the menu open instead of navigating.
        onError={() => undefined}
      />
      <NNotifyFooter asChild>
        <Link href="/notifications">{labels.viewAll}</Link>
      </NNotifyFooter>
    </>
  );
}

/**
 * One shell-owned bell and preview. Radix returns focus to the trigger on
 * close, so keyboard operation survives every dismissal.
 */
export function NotificationsMenu() {
  const { language } = useTranslation();
  const [open, setOpen] = useState(false);
  const labels = useNotifyLabels();
  const unreadCount = useUnreadCount().data?.count ?? 0;

  return (
    <NNotifyRoot onOpenChange={setOpen} open={open}>
      <NNotifyTrigger
        label={labels.open}
        locale={language ?? "en"}
        unreadCount={unreadCount}
        unreadLabel={labels.unread}
      />
      <NNotifyContent>
        <NotificationsMenuBody labels={labels} onClose={() => setOpen(false)} />
      </NNotifyContent>
    </NNotifyRoot>
  );
}
