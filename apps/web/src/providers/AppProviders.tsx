"use client";

import type { KafilLanguage, KafilTheme, KafilTimeZone } from "@/lib/format";
import type { ServerSession } from "najm-auth/client/server";
import { QueryProvider } from "@/providers/QueryProvider";
import type { PublicBranding } from "@/types/branding";
import { AuthProvider } from "najm-auth/client/react";
import { NajmAppProvider } from "najm-kit/app";
import type { NajmDesignConfig } from "najm-kit";
import { uiTranslations } from "@/i18n/translations";
import { auth } from "@/lib/auth";
import { APP_NAME } from "@/types/branding";

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
        <NajmAppProvider
          appName={APP_NAME}
          initialBranding={initialBranding}
          initialDesign={initialDesign}
          initialLanguage={initialLanguage}
          initialTheme={initialTheme}
          initialTimeZone={initialTimeZone}
          translations={uiTranslations}
        >
          {children}
        </NajmAppProvider>
      </QueryProvider>
    </AuthProvider>
  );
}
