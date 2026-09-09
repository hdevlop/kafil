"use client";

import { NSheet } from "najm-kit";
import { Settings2 } from "lucide-react";
import { useTranslation } from "najm-i18n/react";

import { PushOptIn } from "@/features/Notifications/components/PushOptIn";

export function canOpenPersonalSettings(role: string | null | undefined) {
  return role === "family" || role === "sponsor";
}

export function PersonalSettingsSheet({
  open,
  onOpenChange,
  role,
}: Readonly<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: string | null | undefined;
}>) {
  const { t } = useTranslation();

  if (!canOpenPersonalSettings(role)) return null;

  return (
    <NSheet
      classNames={{ body: "px-4", content: "bg-background" }}
      open={open}
      onOpenChange={onOpenChange}
      icon={Settings2}
      title={t("nav.settings")}
      width={500}
    >
      <PushOptIn />
    </NSheet>
  );
}
