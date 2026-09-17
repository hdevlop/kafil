import "server-only";

import { defineNajmPreferences } from "najm-kit/server";
import { createNajmNextServerApp } from "najm-next/app/next";

import { auth } from "@/najm.auth";
import { kafilApp } from "@/najm.config";
import { kafilI18n } from "@kafil/server/locales";
import { kafilTheme } from "@kafil/server/theme";

export const kafilPreferences = defineNajmPreferences({
  i18n: kafilI18n,
  ...kafilApp.preferences,
});

export const najmServer = createNajmNextServerApp({
  app: kafilApp,
  auth,
  theme: kafilTheme,
  themeOptions: {
    getServer: async () => (await import("@kafil/server")).server,
    basePath: "/api",
  },
  preferences: kafilPreferences,
  readSettings: async () => ({}),
  fallbackSettings: {},
  onDiagnostic: (diagnostic) => {
    console.warn("[kafil] public UI settings fallback", diagnostic);
  },
});

export const { getSession, requireSession, requireRole, loadSettings, loadUiSnapshot } = najmServer;
export type KafilUiSnapshot = Awaited<ReturnType<typeof loadUiSnapshot>>;
