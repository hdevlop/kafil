"use client";

import { NBadge, type NBadgeProps } from "najm-kit";

import { formatStatusLabel } from "@/lib/format";

export function StatusBadge({
  status,
  ...props
}: Readonly<{ status: string } & Omit<NBadgeProps, "status">>) {
  return (
    <NBadge
      status={status}
      label={formatStatusLabel(status)}
      look="soft"
      shape="pill"
      {...props}
    />
  );
}
