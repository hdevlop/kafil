"use client";

import { NBadge } from "najm-kit";
import { useTranslation } from "najm-i18n/react";

import {
  buildNotificationViewModel,
  normalizeLocale,
} from "../lib/buildNotificationViewModel";
import type { NotificationRecord } from "../types";

export interface NotificationColumn {
  accessorKey: string;
  header: string;
  cell?: (context: { row: { original: NotificationRecord } }) => React.ReactNode;
  enableSorting?: boolean;
}

export function useNotificationTableColumns(): NotificationColumn[] {
  const { t, language } = useTranslation();
  const locale = normalizeLocale(language ?? "en");

  return [
    {
      accessorKey: "topic",
      header: t("notifications.columnsTitle"),
      cell: ({ row }) => {
        const vm = buildNotificationViewModel(row.original.topic, locale, {
          unknownTitle: t("notifications.unknownTitle"),
          unknownBody: t("notifications.unknownBody"),
        });
        const Icon = vm.icon;
        return (
          <span className="flex min-w-0 items-start gap-2">
            <span aria-hidden="true" className="mt-0.5 shrink-0 text-muted-foreground">
              <Icon size={16} />
            </span>
            <span className="min-w-0">
              <span className="block truncate font-medium">{vm.title}</span>
              <span className="block truncate text-sm text-muted-foreground">
                {vm.body}
              </span>
            </span>
          </span>
        );
      },
    },
    {
      accessorKey: "createdAt",
      header: t("notifications.columnsDate"),
      cell: ({ row }) => {
        try {
          return new Intl.DateTimeFormat(locale, {
            dateStyle: "medium",
            timeStyle: "short",
          }).format(new Date(row.original.createdAt));
        } catch {
          return row.original.createdAt;
        }
      },
    },
    {
      accessorKey: "readAt",
      header: t("notifications.columnsStatus"),
      enableSorting: false,
      cell: ({ row }) =>
        row.original.readAt === null ? (
          <NBadge status="pending">{t("notifications.stateUnread")}</NBadge>
        ) : (
          <NBadge status="delivered">{t("notifications.stateRead")}</NBadge>
        ),
    },
  ];
}
