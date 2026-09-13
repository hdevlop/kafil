import "server-only";

import { cookies, headers } from "next/headers";
import { createReactServerAuth } from "najm-auth/client/server/react";
import type { NLeafletLocationRuntimeProviderProps } from "najm-kit/location/runtime/leaflet";
import { createNajmServerApp } from "najm-next/app/server";

import type { FormFillSetting } from "@/features/Settings/types";
import { auth } from "@/lib/auth";
import { kafilPreferences } from "@/lib/preferences";
import { kafilApp, kafilLocation } from "@/najm.config";
import { kafilTheme } from "@kafil/server/theme";

const serverAuth = createReactServerAuth(auth);
const serverTheme = kafilTheme.react({
  getServer: async () => (await import("@kafil/server")).server,
  basePath: "/api",
});

const resolvedLocationConfig = kafilLocation.resolve(process.env, {
  isDevelopment: process.env.NODE_ENV === "development",
}).config;
if (resolvedLocationConfig.provider === "google") {
  throw new Error("Kafil's location runtime does not allow the Google provider");
}
const locationConfig: NLeafletLocationRuntimeProviderProps["config"] =
  resolvedLocationConfig;

export interface KafilPublicUiSettings {
  formFill: FormFillSetting;
  locationConfig: typeof locationConfig;
}

export const najmServer = createNajmServerApp({
  app: kafilApp,
  auth: serverAuth,
  theme: serverTheme,
  readSettings: async (): Promise<KafilPublicUiSettings> => {
    const { readFormFillEnabled } = await import("@kafil/server/settings-bootstrap");
    return {
      formFill: { enabled: await readFormFillEnabled() },
      locationConfig,
    };
  },
  fallbackSettings: {
    formFill: { enabled: false },
    locationConfig,
  },
  readCookies: cookies,
  readHeaders: headers,
  resolvePreferences: ({ cookies: cookieStore, headers: requestHeaders, session }) =>
    kafilPreferences.resolveOrdered(cookieStore, {
      user: (session?.user ?? {}) as {
        language?: unknown;
        theme?: unknown;
        timeZone?: unknown;
      },
      acceptLanguage: requestHeaders.get("accept-language"),
    }),
  onDiagnostic: (diagnostic) => {
    console.warn("[kafil] public UI settings fallback", diagnostic);
  },
});

// Keep Kafil's richer Najm Auth session type at the leaf facade. The shared
// orchestrator intentionally treats the public session user as opaque.
export const getSession = serverAuth.getSession;
export const requireSession = serverAuth.requireSession;
export const requireRole = serverAuth.requireRole;
export const { loadSettings, loadUiSnapshot } = najmServer;
