import "server-only";

import { defineNajmPreferences } from "najm-kit/server";
import { createNajmNextServerApp } from "najm-next/app/next";

import { auth } from "@/najm.auth";
import { kafilApp, kafilLocation } from "@/najm.config";
import { kafilI18n } from "@kafil/server/locales";
import { kafilTheme } from "@kafil/server/theme";

export const kafilPreferences = defineNajmPreferences({
  i18n: kafilI18n,
  ...kafilApp.preferences,
});

const locationConfig = kafilLocation.resolve(process.env, {
  isDevelopment: process.env.NODE_ENV === "development",
}).config;

export interface KafilPublicUiSettings {
  locationConfig: typeof locationConfig;
}

export const najmServer = createNajmNextServerApp({
  app: kafilApp,
  auth,
  theme: kafilTheme,
  themeOptions: {
    getServer: async () => (await import("@kafil/server")).server,
    basePath: "/api",
  },
  preferences: kafilPreferences,
  readSettings: async (): Promise<KafilPublicUiSettings> => ({ locationConfig }),
  fallbackSettings: {
    locationConfig,
  },
  onDiagnostic: (diagnostic) => {
    console.warn("[kafil] public UI settings fallback", diagnostic);
  },
});

export const { getSession, requireSession, requireRole, loadSettings, loadUiSnapshot } = najmServer;
export type KafilUiSnapshot = Awaited<ReturnType<typeof loadUiSnapshot>>;
