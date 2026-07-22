"use client";

import { cn, NBadge, type NBadgeProps } from "najm-kit";

import { formatStatusLabel } from "@/lib/format";
import { getStatusColor, KAFIL_STATUS_COLORS } from "@/lib/status";

export function StatusBadge({
  status,
  className,
  ...props
}: Readonly<{ status: string } & Omit<NBadgeProps, "status">>) {
  const isNeutral = getStatusColor(status) === "neutral";

  return (
    <NBadge
      status={status}
      statusMap={KAFIL_STATUS_COLORS}
      label={formatStatusLabel(status)}
      look="soft"
      shape="pill"
      {...props}
      className={cn(className, isNeutral && "dark:text-muted-foreground")}
    />
  );
}
