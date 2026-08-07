"use client";

import { AuthProvider } from "najm-auth/client/react";
import type { ServerSession } from "najm-auth/client/server";

import { auth } from "@/lib/auth";
import type { KafilLanguage, KafilTheme, KafilTimeZone } from "@/lib/format";
import { KafilLanguageProvider } from "@/i18n/KafilLanguageProvider";
import { KafilAppearanceProvider } from "@/providers/KafilAppearanceProvider";
import { KafilBrandingProvider } from "@/providers/KafilBrandingProvider";
import { KafilUIBridge } from "@/providers/KafilUIBridge";
import { QueryProvider } from "@/providers/QueryProvider";
import type { PublicAppearance } from "@/types/appearance";
import type { AdminBrandingConfig, PublicBranding } from "@/types/branding";

export function AppProviders({
  children,
  initialAppearance,
  initialBrandingConfig,
  initialBrandingResolved,
  initialLanguage,
  initialSession,
  initialTheme,
  initialTimeZone,
  role,
}: Readonly<{
  children: React.ReactNode;
  initialAppearance: PublicAppearance;
  initialBrandingConfig: AdminBrandingConfig;
  initialBrandingResolved: PublicBranding;
  initialLanguage: KafilLanguage;
  initialSession: ServerSession | null;
  initialTheme: KafilTheme;
  initialTimeZone: KafilTimeZone;
  role?: string | null;
}>) {
  return (
    <AuthProvider client={auth.client} initialSession={initialSession}>
      <QueryProvider>
        <KafilLanguageProvider initialLanguage={initialLanguage}>
          <KafilAppearanceProvider initialAppearance={initialAppearance}>
            <KafilBrandingProvider
              initialConfig={initialBrandingConfig}
              initialResolved={initialBrandingResolved}
              role={role}
            >
              <KafilUIBridge
                initialTheme={initialTheme}
                initialTimeZone={initialTimeZone}
              >
                {children}
              </KafilUIBridge>
            </KafilBrandingProvider>
          </KafilAppearanceProvider>
        </KafilLanguageProvider>
      </QueryProvider>
    </AuthProvider>
  );
}
