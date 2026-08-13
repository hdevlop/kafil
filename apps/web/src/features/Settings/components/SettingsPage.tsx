"use client";

import { useRouter } from "next/navigation";

import { AppSettingsSheet } from "./SettingsSheets";

export function SettingsPage({ role }: Readonly<{ role: string | null | undefined }>) {
  const router = useRouter();

  return (
    <AppSettingsSheet
      open
      role={role}
      onOpenChange={(open) => {
        if (!open) router.replace("/dashboard");
      }}
    />
  );
}
