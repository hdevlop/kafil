"use client";

import { forwardRef, type ComponentPropsWithoutRef } from "react";
import { Bell } from "lucide-react";
import { cn, NButton, NIndicator } from "najm-kit";
import { useTranslation } from "najm-i18n/react";

import { useUnreadCount } from "../hooks/useNotifications";
import { formatBadgeCount } from "../lib/buildNotificationViewModel";

type NotificationBellProps = Omit<
  ComponentPropsWithoutRef<typeof NButton>,
  "children"
>;

/**
 * Shell-owned unread indicator. Badge hides at zero, shows a localized
 * number for 1-99, and `99+` above 99. Count changes announce via aria-live.
 */
export const NotificationBell = forwardRef<
  HTMLButtonElement,
  NotificationBellProps
>(function NotificationBell({ className, ...buttonProps }, ref) {
  const { t, language } = useTranslation();
  const countQuery = useUnreadCount();
  const count = countQuery.data?.count ?? 0;

  const badge = formatBadgeCount(count, language ?? "en");

  const button = (
    <NButton
      {...buttonProps}
      aria-label={t("notifications.openInbox")}
      className={cn(
        "text-foreground hover:text-foreground [&_svg]:text-foreground [&_svg]:opacity-100",
        className,
      )}
      ref={ref}
      size="icon"
      type="button"
      variant="ghost"
    >
      <Bell size={18} />
      <span aria-live="polite" className="sr-only">
        {count > 0 ? t("notifications.unreadBadge", { count }) : ""}
      </span>
    </NButton>
  );

  // Hidden at zero: the default indicator overlay is a persistent dot, so
  // only wrap the button once there is a localized count to show.
  if (!badge) return button;

  return (
    <NIndicator overlay="badge" content={badge} color="destructive">
      {button}
    </NIndicator>
  );
});
