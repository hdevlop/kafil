"use client";

import { NajmAppProvider } from "najm-next/app/client";
import type { NTableDefaults } from "najm-kit";
import { auth } from "@/najm.auth";
import type { KafilUiSnapshot } from "@/najm.server";
import { kafilUiI18n } from "@kafil/contracts/locales";

const tableDefaults: NTableDefaults = { dataActions: true };

export function AppProviders({  children,snapshot,}: Readonly<{ children: React.ReactNode; snapshot: KafilUiSnapshot;}>) {
  return (
    <NajmAppProvider
      authClient={auth.client}
      snapshot={snapshot}
      i18n={kafilUiI18n}
      tableDefaults={tableDefaults}
    >
      {children}
    </NajmAppProvider>
  );
}
