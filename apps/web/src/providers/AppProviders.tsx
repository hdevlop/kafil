"use client";

import { AuthProvider } from "najm-auth/client/react";
import type { ServerSession } from "najm-auth/client/server";

import { auth } from "@/lib/auth";
import type { KafilLanguage } from "@/lib/format";
import { KafilLanguageProvider } from "@/i18n/KafilLanguageProvider";
import { KafilDesignProvider } from "@/providers/KafilDesignProvider";
import { QueryProvider } from "@/providers/QueryProvider";
import { ThemePreferenceProvider, type KafilTheme } from "@/providers/ThemePreferenceProvider";

export function AppProviders({
  children,
  initialLanguage,
  initialSession,
  initialTheme,
}: Readonly<{
  children: React.ReactNode;
  initialLanguage: KafilLanguage;
  initialSession: ServerSession | null;
  initialTheme: KafilTheme;
}>) {
  return (
    <AuthProvider client={auth.client} initialSession={initialSession}>
      <QueryProvider>
        <KafilLanguageProvider initialLanguage={initialLanguage}>
          <ThemePreferenceProvider initialTheme={initialTheme}>
            <KafilDesignProvider>{children}</KafilDesignProvider>
          </ThemePreferenceProvider>
        </KafilLanguageProvider>
      </QueryProvider>
    </AuthProvider>
  );
}
