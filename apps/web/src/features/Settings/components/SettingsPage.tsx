"use client";

import { useRouter } from "next/navigation";

import { GlobalSettingsSheet } from "./GlobalSettingsSheet";

export function SettingsPage({ role }: Readonly<{ role: string | null | undefined }>) {
  const router = useRouter();

  return (
    <GlobalSettingsSheet
      open
      role={role}
      onOpenChange={(open) => {
        if (!open) router.replace("/operator");
      }}
    />
  );
}
