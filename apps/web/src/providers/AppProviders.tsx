"use client";

import { AuthProvider } from "najm-auth/client/react";
import type { ServerSession } from "najm-auth/client/server";

import { auth } from "@/lib/auth";
import type { KafilLanguage, KafilTimeZone } from "@/lib/format";
import { KafilLanguageProvider } from "@/i18n/KafilLanguageProvider";
import { KafilAppearanceProvider } from "@/providers/KafilAppearanceProvider";
import { KafilDesignProvider } from "@/providers/KafilDesignProvider";
import { QueryProvider } from "@/providers/QueryProvider";
import { ThemePreferenceProvider, type KafilTheme } from "@/providers/ThemePreferenceProvider";
import { TimeZonePreferenceProvider } from "@/providers/TimeZonePreferenceProvider";
import type { PublicAppearance } from "@/types/appearance";

export function AppProviders({
  children,
  initialAppearance,
  initialLanguage,
  initialSession,
  initialTheme,
  initialTimeZone,
}: Readonly<{
  children: React.ReactNode;
  initialAppearance: PublicAppearance;
  initialLanguage: KafilLanguage;
  initialSession: ServerSession | null;
  initialTheme: KafilTheme;
  initialTimeZone: KafilTimeZone;
}>) {
  return (
    <AuthProvider client={auth.client} initialSession={initialSession}>
      <QueryProvider>
        <KafilLanguageProvider initialLanguage={initialLanguage}>
          <ThemePreferenceProvider initialTheme={initialTheme}>
            <TimeZonePreferenceProvider initialTimeZone={initialTimeZone}>
              <KafilAppearanceProvider initialAppearance={initialAppearance}>
                <KafilDesignProvider>{children}</KafilDesignProvider>
              </KafilAppearanceProvider>
            </TimeZonePreferenceProvider>
          </ThemePreferenceProvider>
        </KafilLanguageProvider>
      </QueryProvider>
    </AuthProvider>
  );
}
