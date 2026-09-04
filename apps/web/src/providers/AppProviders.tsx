"use client";

import type { ServerSession } from "najm-auth/client/server";
import { QueryProvider } from "@/providers/QueryProvider";
import type { PublicBranding } from "najm-theme";
import { NThemeBrandingProvider } from "najm-theme/react";
import { AuthProvider, useAuth } from "najm-auth/client/react";
import { NajmAppProvider } from "najm-kit/app";
import type { NajmDesignConfig } from "najm-kit";
import { kafilUiI18n } from "@kafil/server/locales";
import { KAFIL_BADGE_DEFAULTS } from "@/features/StatusLabels";
import { auth } from "@/lib/auth";
import { APP_NAME } from "@/types/branding";
import {
  KAFIL_CURRENCY,
  KAFIL_LOCALES,
  type KafilLanguage,
  type KafilTheme,
  type KafilTimeZone,
} from "@/preferences";
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
  initialLanguage: KafilLanguage;
  initialTheme: KafilTheme;
  initialTimeZone: KafilTimeZone;
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
      locales={KAFIL_LOCALES}
      translations={kafilUiI18n.translations}
      defaultLanguage={kafilUiI18n.defaultLanguage}
      fallbackToDefaultLanguage={kafilUiI18n.fallbackToDefaultLanguage}
      getLanguageDirection={(language) =>
        kafilUiI18n.direction(kafilUiI18n.normalizeLanguage(language))
      }
    >
      {/*
        Carries the resolved slots *and* the factory paths into the client, so
        `NThemeImage` can fall back without Kafil hard-coding a public path. It
        sits inside `NajmAppProvider` rather than outside because the sidebar
        marks above still come from the kit's own branding prop; both read the
        same server snapshot, so they cannot disagree.
      */}
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
  initialLanguage: KafilLanguage;
  initialSession: ServerSession | null;
  initialTheme: KafilTheme;
  initialTimeZone: KafilTimeZone;
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
