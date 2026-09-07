"use client";

import Link from "next/link";
import { NButton, NBadge, Card, CardContent } from "najm-kit";
import { useTranslation } from "najm-i18n/react";

import { useMarkNotificationRead } from "../hooks/useNotificationCommands";
import {
  buildNotificationViewModel,
  normalizeLocale,
} from "../lib/buildNotificationViewModel";
import type { NotificationRecord } from "../types";

function timeLabel(iso: string, locale: string, justNow: string) {
  const then = Date.parse(iso);
  if (!Number.isFinite(then)) return justNow;
  const diffMs = Date.now() - then;
  if (diffMs < 60_000) return justNow;
  try {
    return new Intl.DateTimeFormat(locale, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(then));
  } catch {
    return justNow;
  }
}

export function NotificationCard({
  notification,
  onNavigate,
}: Readonly<{
  notification: NotificationRecord;
  onNavigate?: () => void;
}>) {
  const { t, language } = useTranslation();
  const markRead = useMarkNotificationRead();
  const locale = normalizeLocale(language ?? notification.locale);
  const vm = buildNotificationViewModel(notification.topic, locale, {
    unknownTitle: t("notifications.unknownTitle"),
    unknownBody: t("notifications.unknownBody"),
  });
  const Icon = vm.icon;
  const unread = notification.readAt === null;

  async function handleNavigation() {
    // Next invokes onNavigate only for an accepted client-side navigation.
    // Closing and read confirmation therefore happen after the detail/focus
    // action has been accepted, not for modified clicks or downloads.
    onNavigate?.();
    if (unread) {
      try {
        await markRead.mutateAsync(notification.id);
      } catch {
        // The shared command hook already presents the error.
      }
    }
  }

  return (
    <Card
      className={unread ? "border-primary/40" : undefined}
      data-notification-id={notification.id}
    >
      <CardContent className="flex items-start gap-3 p-4">
        <span aria-hidden="true" className="mt-0.5 shrink-0 text-muted-foreground">
          <Icon size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-semibold">{vm.title}</p>
            {unread ? (
              <NBadge status="pending">{t("notifications.stateUnread")}</NBadge>
            ) : null}
          </div>
          <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">
            {vm.body}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {timeLabel(notification.createdAt, locale, t("notifications.justNow"))}
          </p>
          <div className="mt-2 flex gap-2">
            <NButton asChild size="sm" variant="outline">
              <Link
                href={`${vm.href}?focus=${notification.id}`}
                onNavigate={() => void handleNavigation()}
              >
                {t("common.view")}
              </Link>
            </NButton>
            {unread ? (
              <NButton
                disabled={markRead.isPending}
                onClick={async () => {
                  try {
                    await markRead.mutateAsync(notification.id);
                    onNavigate?.();
                  } catch {
                    // handled by the shared hook
                  }
                }}
                size="sm"
                type="button"
                variant="ghost"
              >
                {markRead.isPending ? t("notifications.marking") : t("notifications.markRead")}
              </NButton>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
