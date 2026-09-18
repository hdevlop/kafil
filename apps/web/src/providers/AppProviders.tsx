"use client";

import { NajmAppProvider } from "najm-next/app/client";
import { auth } from "@/najm.auth";
import type { KafilUiSnapshot } from "@/najm.server";
import { kafilUiI18n } from "@kafil/server/locales";

export function AppProviders({  children,snapshot,}: Readonly<{ children: React.ReactNode; snapshot: KafilUiSnapshot;}>) {
  return (
    <NajmAppProvider
      authClient={auth.client}
      snapshot={snapshot}
      i18n={kafilUiI18n}
    >
      {children}
    </NajmAppProvider>
  );
}
