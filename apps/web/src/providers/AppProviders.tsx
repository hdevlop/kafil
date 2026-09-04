"use client";

import type { ServerSession } from "najm-auth/client/server";
import { QueryProvider } from "@/providers/QueryProvider";
import type { PublicBranding } from "najm-theme";
import { NThemeBrandingProvider } from "najm-theme/react";
import { AuthProvider, useAuth } from "najm-auth/client/react";
import { NajmAppProvider } from "najm-kit/app";
import type { NajmDesignConfig } from "najm-kit";
import type { NajmMode, NajmPreferenceTimeZone } from "najm-kit/server";
import { kafilLocales, kafilUiI18n, type KafilLocale } from "@kafil/server/locales";
import { KAFIL_CURRENCY } from "@kafil/server/money";
import { KAFIL_BADGE_DEFAULTS } from "@/features/StatusLabels";
import { auth } from "@/lib/auth";
import { APP_NAME } from "@/types/branding";
import type { kafilPreferences } from "@/lib/preferences";
import { useEntityQuery } from "@/hooks/useEntityQuery";
import { getFormFillSetting } from "@/services/settingApi";

function NajmProviders({
  children,
  initialBranding,
  initialDesign,
  initialLanguage,
  initialTheme,
  initialTimeZone,
}: Readonly<{
  children: React.ReactNode;
  initialBranding: PublicBranding;
  initialDesign: NajmDesignConfig;
  initialLanguage: KafilLocale;
  initialTheme: NajmMode;
  initialTimeZone: NajmPreferenceTimeZone<typeof kafilPreferences>;
}>) {
  const { isAuthenticated } = useAuth();
  const formFillSetting = useEntityQuery({
    queryKey: ["settings", "form-fill"] as const,
    queryFn: getFormFillSetting,
    enabled: isAuthenticated,
    refetchInterval: 15_000,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  return (
    <NajmAppProvider
      appName={APP_NAME}
      badgeDefaults={KAFIL_BADGE_DEFAULTS}
      currency={KAFIL_CURRENCY}
      formDevTools={formFillSetting.data?.enabled === true}
      initialBranding={{
        sidebarLogoExpandedPath: initialBranding.slots.sidebarLogoExpanded,
        sidebarLogoCollapsedPath: initialBranding.slots.sidebarLogoCollapsed,
      }}
      initialDesign={initialDesign}
      initialLanguage={initialLanguage}
      initialTheme={initialTheme}
      initialTimeZone={initialTimeZone}
      locales={kafilLocales}
      translations={kafilUiI18n.translations}
      defaultLanguage={kafilUiI18n.defaultLanguage}
      fallbackToDefaultLanguage={kafilUiI18n.fallbackToDefaultLanguage}
      getLanguageDirection={(language) =>
        kafilUiI18n.direction(kafilUiI18n.normalizeLanguage(language))
      }
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
  initialLanguage,
  initialSession,
  initialTheme,
  initialTimeZone,
}: Readonly<{
  children: React.ReactNode;
  initialBranding: PublicBranding;
  initialDesign: NajmDesignConfig;
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
