"use client";

import { createNajmAppProvider } from "najm-next/app/client";
import { KAFIL_BADGE_DEFAULTS } from "@/features/StatusLabels";
import { auth } from "@/najm.auth";
import type { KafilUiSnapshot } from "@/najm.server";
import { KafilLocationProvider } from "@/providers/KafilLocationProvider";
import { APP_NAME } from "@/types/branding";
import { kafilUiI18n } from "@kafil/server/locales";
import { KAFIL_CURRENCY } from "@kafil/server/money";

type LocationProps = Omit<
  React.ComponentProps<typeof KafilLocationProvider>,
  "children"
>;

const NajmAppProvider = createNajmAppProvider<KafilUiSnapshot, LocationProps>({
  authClient: auth.client,
  location: {
    Provider: KafilLocationProvider,
    selectProps: (snapshot) => ({
      config: snapshot.settings.locationConfig,
    }),
  },
});

export function AppProviders({
  children,
  snapshot,
}: Readonly<{ children: React.ReactNode; snapshot: KafilUiSnapshot }>) {
  return (
    <NajmAppProvider
      snapshot={snapshot}
      i18n={kafilUiI18n}
      appName={APP_NAME}
      badgeDefaults={KAFIL_BADGE_DEFAULTS}
      currency={KAFIL_CURRENCY}
    >
      {children}
    </NajmAppProvider>
  );
}
