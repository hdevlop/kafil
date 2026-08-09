"use client";

import { NBadge, type NBadgeProps } from "najm-kit";

import { formatStatusLabel } from "@/features/StatusLabels";
import { useKafilLanguage } from "@/i18n/useKafilLanguage";

export function StatusBadge({
  status,
  ...props
}: Readonly<{ status: string } & Omit<NBadgeProps, "status">>) {
  const { language } = useKafilLanguage();
  return (
    <NBadge
      status={status}
      label={formatStatusLabel(status, language)}
      look="soft"
      shape="pill"
      {...props}
    />
  );
}
