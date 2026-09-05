"use client";

import type { ServerSession } from "najm-auth/client/server";
import { QueryProvider } from "@/providers/QueryProvider";
import type { PublicBranding } from "najm-theme";
import { NThemeBrandingProvider } from "najm-theme/react";
import { AuthProvider } from "najm-auth/client/react";
import { NajmAppProvider } from "najm-kit/app";
import type { NajmDesignConfig } from "najm-kit";
import type { NajmMode, NajmPreferenceTimeZone } from "najm-kit/server";
import { kafilUiI18n, type KafilLocale } from "@kafil/server/locales";
import { KAFIL_CURRENCY } from "@kafil/server/money";
import { KAFIL_BADGE_DEFAULTS } from "@/features/StatusLabels";
import { auth } from "@/lib/auth";
import { APP_NAME } from "@/types/branding";
import type { kafilPreferences } from "@/lib/preferences";
import type { FormFillSetting } from "@/features/Settings/types";
import { useEntityQuery } from "@/hooks/useEntityQuery";
import { getFormFillSetting } from "@/services/settingApi";

function NajmProviders({
  children,
  initialBranding,
  initialDesign,
  initialFormFill,
  initialLanguage,
  initialTheme,
  initialTimeZone,
}: Readonly<{
  children: React.ReactNode;
  initialBranding: PublicBranding;
  initialDesign: NajmDesignConfig;
  initialFormFill: FormFillSetting;
  initialLanguage: KafilLocale;
  initialTheme: NajmMode;
  initialTimeZone: NajmPreferenceTimeZone<typeof kafilPreferences>;
}>) {
  // Seeded by the layout, so F8 is live on first paint. The read is public by
  // design because the shortcut also serves public forms; only writes require
  // an operator or admin. Other sessions refresh the value on their next focus.
  const formFillSetting = useEntityQuery({
    queryKey: ["settings", "form-fill"] as const,
    queryFn: getFormFillSetting,
    initialData: initialFormFill,
    refetchOnWindowFocus: true,
    staleTime: 60_000,
  });

  return (
    <NajmAppProvider
      i18n={kafilUiI18n}
      appName={APP_NAME}
      badgeDefaults={KAFIL_BADGE_DEFAULTS}
      currency={KAFIL_CURRENCY}
      formDevTools={formFillSetting.data.enabled}
      initialBranding={initialBranding}
      initialDesign={initialDesign}
      initialLanguage={initialLanguage}
      initialTheme={initialTheme}
      initialTimeZone={initialTimeZone}
    >
      <NThemeBrandingProvider branding={initialBranding}>
        {children}
      </NThemeBrandingProvider>
    </NajmAppProvider>
  );
}

export function AppProviders({
  children,
  initialBranding,
  initialDesign,
  initialFormFill,
  initialLanguage,
  initialSession,
  initialTheme,
  initialTimeZone,
}: Readonly<{
  children: React.ReactNode;
  initialBranding: PublicBranding;
  initialDesign: NajmDesignConfig;
  initialFormFill: FormFillSetting;
  initialLanguage: KafilLocale;
  initialSession: ServerSession | null;
  initialTheme: NajmMode;
  initialTimeZone: NajmPreferenceTimeZone<typeof kafilPreferences>;
}>) {
  return (
    <AuthProvider client={auth.client} initialSession={initialSession}>
      <QueryProvider>
        <NajmProviders
          initialBranding={initialBranding}
          initialDesign={initialDesign}
          initialFormFill={initialFormFill}
          initialLanguage={initialLanguage}
          initialTheme={initialTheme}
          initialTimeZone={initialTimeZone}
        >
          {children}
        </NajmProviders>
      </QueryProvider>
    </AuthProvider>
  );
}
