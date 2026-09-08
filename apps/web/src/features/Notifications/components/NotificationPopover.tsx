"use client";

import Link from "next/link";
import { useState } from "react";
import {
  NButton,
  NEmptyState,
  NErrorState,
  NLoadingState,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "najm-kit";
import { Bell } from "lucide-react";
import { useTranslation } from "najm-i18n/react";

import { useMarkAllNotificationsRead } from "../hooks/useNotificationCommands";
import { useNotifications } from "../hooks/useNotifications";
import { NotificationBell } from "./NotificationBell";
import { NotificationCard } from "./NotificationCard";

function NotificationPopoverBody({
  onNavigate,
}: Readonly<{ onNavigate: () => void }>) {
  const { t } = useTranslation();
  const [markError, setMarkError] = useState<string | null>(null);
  // Opening the popover never marks rows read; refetch on open keeps the
  // preview fresh without changing global query defaults.
  const list = useNotifications({ limit: 5 }, { refetchOnMount: "always" });
  const markAll = useMarkAllNotificationsRead();

  async function handleMarkAll() {
    setMarkError(null);
    try {
      await markAll.mutateAsync();
    } catch (error) {
      setMarkError(
        error instanceof Error ? error.message : t("notifications.loadError"),
      );
    }
  }

  return (
    <div className="flex max-h-[70vh] w-[min(24rem,calc(100vw-2rem))] flex-col gap-2 p-2">
      <div className="flex items-center justify-between px-2 pt-1">
        <p className="text-sm font-semibold">{t("notifications.inboxTitle")}</p>
        <NButton
          disabled={markAll.isPending}
          onClick={() => void handleMarkAll()}
          size="sm"
          type="button"
          variant="ghost"
        >
          {markAll.isPending
            ? t("notifications.markingAll")
            : t("notifications.markAllRead")}
        </NButton>
      </div>
      {markError ? (
        <p role="alert" className="px-2 text-sm text-destructive">
          {markError}
        </p>
      ) : null}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {list.isPending ? (
          <NLoadingState label={t("notifications.loading")} />
        ) : list.isError ? (
          <NErrorState
            title={t("notifications.loadError")}
            retryLabel={t("notifications.retry")}
            onRetry={() => void list.refetch()}
          />
        ) : list.data.rows.length === 0 ? (
          <NEmptyState
            icon={Bell}
            title={t("notifications.emptyTitle")}
            description={t("notifications.emptyBody")}
          />
        ) : (
          <div className="flex flex-col gap-2">
            {list.data.rows.map((notification) => (
              <NotificationCard
                key={notification.id}
                notification={notification}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        )}
      </div>
      <div className="flex justify-end border-t border-border px-2 pt-2">
        <NButton asChild size="sm" variant="link">
          <Link href="/notifications" onClick={onNavigate}>
            {t("notifications.viewAll")}
          </Link>
        </NButton>
      </div>
    </div>
  );
}

/**
 * One shell-owned bell + popover. Radix returns focus to the trigger on
 * close, keeping keyboard operation intact.
 */
export function NotificationsMenu() {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <NotificationBell />
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8}>
        {open ? (
          <NotificationPopoverBody onNavigate={() => setOpen(false)} />
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
