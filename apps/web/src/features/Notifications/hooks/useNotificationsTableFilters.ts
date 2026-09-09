"use client";

import { useMemo } from "react";
import { useTranslation } from "najm-i18n/react";

export function useNotificationsTableFilters(
  unreadOnly: boolean,
  onUnreadOnlyChange: (unreadOnly: boolean) => void,
) {
  const { t } = useTranslation();

  return useMemo(
    () => [
      {
        type: "select" as const,
        showIcon: false,
        name: "unread",
        placeholder: t("notifications.allFilter"),
        value: unreadOnly ? "unread" : "",
        onChange: (value: string) => onUnreadOnlyChange(value === "unread"),
        options: [
          {
            value: "unread",
            label: t("notifications.unreadFilter"),
          },
        ],
      },
    ],
    [onUnreadOnlyChange, t, unreadOnly],
  );
}
