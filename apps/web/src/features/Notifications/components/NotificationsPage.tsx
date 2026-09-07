"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Bell, CheckCheck, Eye } from "lucide-react";
import {
  NButton,
  NEmptyState,
  NErrorState,
  NPageHeader,
  NPageLayout,
  NTable,
  type NTableProps,
  useDesktopTableMode,
} from "najm-kit";
import { useTranslation } from "najm-i18n/react";

import PageHeaderGlobalActions from "@/shared/PageHeaderGlobalActions";
import {
  getNotificationSettings,
  updateNotificationSettings,
} from "@/services/notificationsApi";
import { useNotifications } from "../hooks/useNotifications";
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
} from "../hooks/useNotificationCommands";
import { useNotificationTableColumns } from "../config/notificationColumns";
import {
  buildNotificationViewModel,
  normalizeLocale,
} from "../lib/buildNotificationViewModel";
import { synchronizeNotificationLocale } from "../lib/synchronizeNotificationLocale";
import type { NotificationRecord } from "../types";
import { NotificationCard } from "./NotificationCard";
import { PushOptIn } from "./PushOptIn";

const PAGE_SIZE = 20;

export function NotificationsPage() {
  const { t, language } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const focusId = searchParams.get("focus");
  const tableMode = useDesktopTableMode();
  const columns = useNotificationTableColumns();
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();

  const [unreadOnly, setUnreadOnly] = useState(false);
  const [settingsSyncFailed, setSettingsSyncFailed] = useState(false);
  const [pageIndex, setPageIndex] = useState(0);
  // Cursor chain: page 0 starts without a cursor; every later page continues
  // from the previous page's nextCursor. Cached per query key by React Query,
  // so already-fetched pages never reorder when new rows arrive.
  const [cursorChain, setCursorChain] = useState<Array<string | null>>([null]);
  const focusedOnce = useRef(new Set<string>());

  const cursor = cursorChain[pageIndex] ?? undefined;
  const list = useNotifications({
    limit: PAGE_SIZE,
    cursor,
    unread: unreadOnly || undefined,
  }, { refetchOnMount: "always" });

  const rows = useMemo(() => list.data?.rows ?? [], [list.data]);
  const nextCursor = list.data?.nextCursor ?? null;

  // Retry the external-channel locale sync on this surface: a language
  // change that failed to persist server-side is reconciled here without
  // ever blocking the UI language itself.
  useEffect(() => {
    let cancelled = false;
    async function syncLocale() {
      const uiLocale = normalizeLocale(language ?? "en");
      const synced = await synchronizeNotificationLocale(uiLocale, {
        getSettings: getNotificationSettings,
        updateSettings: updateNotificationSettings,
      });
      if (!cancelled) setSettingsSyncFailed(!synced);
    }
    void syncLocale();
    return () => {
      cancelled = true;
    };
  }, [language]);

  function resetToFirstPage(unread: boolean) {
    setUnreadOnly(unread);
    setPageIndex(0);
    setCursorChain([null]);
  }

  function goToPage(next: number) {
    // Fill the cursor for the next page from the current page's nextCursor
    // at navigation time, so no render-sync effect is needed. Pagination is
    // sequential, so a forward step always consumes the current nextCursor.
    const currentNext = list.data?.nextCursor ?? null;
    setCursorChain((chain) => {
      if (next > pageIndex && currentNext && chain[next] === undefined) {
        const copy = [...chain];
        copy[next] = currentNext;
        return copy;
      }
      return chain;
    });
    setPageIndex(next);
  }

  async function openNotification(notification: NotificationRecord) {
    const locale = normalizeLocale(language ?? notification.locale);
    const vm = buildNotificationViewModel(notification.topic, locale, {
      unknownTitle: t("notifications.unknownTitle"),
      unknownBody: t("notifications.unknownBody"),
    });
    router.push(`${vm.href}?focus=${notification.id}`);
    if (notification.readAt === null) {
      try {
        await markRead.mutateAsync(notification.id);
      } catch {
        // The shared command hook already presents the error.
      }
    }
  }

  // ?focus=<id> from a push click: highlight the row and mark it read after
  // the focus action succeeds. Unknown focus ids explain instead of failing.
  useEffect(() => {
    if (!focusId || focusedOnce.current.has(focusId)) return;
    const target = rows.find((row) => row.id === focusId);
    if (!target) return;
    focusedOnce.current.add(focusId);
    document
      .querySelector(`[data-notification-id="${focusId}"]`)
      ?.scrollIntoView({ block: "nearest" });
    if (target.readAt === null) {
      void markRead.mutateAsync(focusId).catch(() => undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusId, rows]);

  const focusMissing = Boolean(
    focusId && !list.isPending && !rows.some((row) => row.id === focusId),
  );

  const tableProps: NTableProps<NotificationRecord> = {
    data: rows,
    columns,
    loading: list.isPending,
    error: list.error,
    getRowId: (row) => row.id,
    selectedRowId: focusId,
    getRowClassName: (row) =>
      row.id === focusId ? "ring-2 ring-primary/50" : undefined,
    onView: (row) => void openNotification(row),
    onRowClick: (row) => void openNotification(row),
    renderCard: ({ data, "data-row-id": rowId }) => (
      <div data-notification-id={rowId}>
        <NotificationCard notification={data} />
      </div>
    ),
    renderEmpty: () => (
      <NEmptyState
        surface="panel"
        icon={Bell}
        title={t("notifications.emptyTitle")}
        description={
          focusMissing
            ? t("notifications.focusMissing")
            : t("notifications.emptyBody")
        }
      />
    ),
    renderError: (error) => (
      <NErrorState
        message={error instanceof Error ? error.message : t("notifications.loadError")}
        onRetry={() => void list.refetch()}
        surface="panel"
      />
    ),
    menu: {
      row: (row) => [
        {
          label: t("common.view"),
          icon: Eye,
          onSelect: () => void openNotification(row),
        },
        ...(row.readAt === null
          ? [
              {
                label: t("notifications.markRead"),
                icon: CheckCheck,
                onSelect: () => {
                  void markRead.mutateAsync(row.id).catch(() => undefined);
                },
              },
            ]
          : []),
      ],
    },
    menuButton: true,
    manualPagination: true,
    hasNextPage: nextCursor !== null,
    pagination: { pageIndex, pageSize: PAGE_SIZE },
    onPaginationChange: ({ pageIndex: next }) => goToPage(next),
    showPagination: true,
    responsiveCards: true,
    defaultMode: "cards",
    mode: tableMode,
    noDataText: t("notifications.emptyTitle"),
    loadingText: t("notifications.loading"),
    dynamicHeight: true,
  };

  return (
    <NPageLayout className="flex h-full min-h-0 flex-col gap-4">
      <NPageHeader
        icon={Bell}
        title={t("notifications.inboxTitle")}
        subtitle={t("notifications.inboxSubtitle")}
        actions={
          <span className="flex items-center gap-2">
            <NButton
              disabled={markAll.isPending}
              onClick={() => void markAll.mutateAsync().catch(() => undefined)}
              size="sm"
              type="button"
              variant="outline"
            >
              {markAll.isPending
                ? t("notifications.markingAll")
                : t("notifications.markAllRead")}
            </NButton>
            <PageHeaderGlobalActions />
          </span>
        }
      />
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label={t("notifications.inboxTitle")}>
        <NButton
          onClick={() => resetToFirstPage(false)}
          size="sm"
          type="button"
          variant={unreadOnly ? "outline" : "default"}
        >
          {t("notifications.allFilter")}
        </NButton>
        <NButton
          onClick={() => resetToFirstPage(true)}
          size="sm"
          type="button"
          variant={unreadOnly ? "default" : "outline"}
        >
          {t("notifications.unreadFilter")}
        </NButton>
      </div>
      {settingsSyncFailed ? (
        <p role="alert" className="text-sm text-muted-foreground">
          {t("notifications.settingsFailed")}
        </p>
      ) : null}
      {focusMissing && rows.length > 0 ? (
        <p role="status" className="text-sm text-muted-foreground">
          {t("notifications.focusMissing")}
        </p>
      ) : null}
      <PushOptIn />
      <div className="min-h-0 flex-1">
        <NTable {...tableProps} />
      </div>
    </NPageLayout>
  );
}
