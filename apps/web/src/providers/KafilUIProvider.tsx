"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { NajmAppProvider } from "najm-kit/app";

import { uiTranslations } from "@/i18n/translations";
import {
  normalizeKafilTimeZone,
  type KafilLanguage,
  type KafilTheme,
  type KafilTimeZone,
} from "@/lib/format";
import { APP_NAME } from "@/types/branding";
import type { AdminBrandingConfig, PublicBranding } from "@/types/branding";
import type { PublicAppearance } from "@/types/appearance";

import { useAppearanceState } from "./useAppearanceState";
import type { KafilAppearanceContextValue } from "./useAppearanceState";
import { useBrandingState } from "./useBrandingState";
import type { KafilBrandingContextValue } from "./useBrandingState";

const KafilAppearanceContext = createContext<KafilAppearanceContextValue | null>(
  null,
);
const KafilBrandingContext = createContext<KafilBrandingContextValue | null>(
  null,
);

/**
 * Kafil's whole UI layer, as one component.
 *
 * This was four nested providers, and the nesting was not a style choice: each
 * one existed to *read* the context the one above it published, so the design
 * consumer could not sit in the same component as the appearance state feeding
 * it. Owning both state machines here makes `design` and the resolved branding
 * ordinary values, which leaves nothing to bridge.
 *
 * One component, not one file — the state lives in `useAppearanceState` and
 * `useBrandingState`. Collapsing the tree never required collapsing the code.
 *
 * Everything generic comes from `NajmAppProvider`: language, theme, time zone,
 * the design context, branding display and `NTable` defaults. What stays is
 * only what Kafil owns — the draft/commit editing model, which is a product
 * feature with a server module behind it, not provider glue. An application
 * without a theme editor mounts `NajmAppProvider` directly.
 */
export function KafilUIProvider({
  children,
  initialAppearance,
  initialBrandingConfig,
  initialBrandingResolved,
  initialLanguage,
  initialTheme,
  initialTimeZone,
  role,
}: Readonly<{
  children: ReactNode;
  initialAppearance: PublicAppearance;
  initialBrandingConfig: AdminBrandingConfig;
  initialBrandingResolved: PublicBranding;
  initialLanguage: KafilLanguage;
  initialTheme: KafilTheme;
  initialTimeZone: KafilTimeZone;
  role?: string | null;
}>) {
  const appearance = useAppearanceState(initialAppearance);
  const branding = useBrandingState(
    initialBrandingConfig,
    initialBrandingResolved,
    role,
  );

  const kitBranding = useMemo(
    () => ({
      appName: APP_NAME,
      logoExpanded: branding.resolved.sidebarLogoExpandedPath,
      logoCollapsed: branding.resolved.sidebarLogoCollapsedPath,
    }),
    [branding.resolved],
  );

  return (
    <KafilAppearanceContext.Provider value={appearance}>
      <KafilBrandingContext.Provider value={branding}>
        <NajmAppProvider
          branding={kitBranding}
          className="min-h-full"
          design={appearance.design}
          initialLanguage={initialLanguage}
          initialTheme={initialTheme}
          initialTimeZone={initialTimeZone}
          normalizeTimeZone={normalizeKafilTimeZone}
          translations={uiTranslations}
        >
          {children}
        </NajmAppProvider>
      </KafilBrandingContext.Provider>
    </KafilAppearanceContext.Provider>
  );
}

export function useKafilAppearance() {
  const context = useContext(KafilAppearanceContext);
  if (!context) {
    throw new Error("useKafilAppearance must be used within KafilUIProvider.");
  }
  return context;
}

export function useKafilBranding() {
  const context = useContext(KafilBrandingContext);
  if (!context) {
    throw new Error("useKafilBranding must be used within KafilUIProvider.");
  }
  return context;
}

export type { AdminBrandingConfig, BrandingDraft } from "@/types/branding";
