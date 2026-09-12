"use client";

import type { ServerSession } from "najm-auth/client/server";
import { QueryProvider } from "@/providers/QueryProvider";
import type { PublicBranding } from "najm-theme";
import { NThemeBrandingProvider } from "najm-theme/react";
import { AuthProvider } from "najm-auth/client/react";
import { NajmAppProvider } from "najm-kit/app";
import type { NajmDesignConfig } from "najm-kit";
import {
  NLeafletLocationRuntimeProvider,
  type NLeafletLocationRuntimeProviderProps,
} from "najm-kit/location/runtime/leaflet";
import type { NajmMode, NajmPreferenceTimeZone } from "najm-kit/server";
import { useTranslation } from "najm-i18n/react";
import { kafilUiI18n, type KafilLocale } from "@kafil/server/locales";
import { KAFIL_CURRENCY } from "@kafil/server/money";
import { KAFIL_BADGE_DEFAULTS } from "@/features/StatusLabels";
import { auth } from "@/lib/auth";
import { APP_NAME } from "@/types/branding";
import type { kafilPreferences } from "@/lib/preferences";
import type { FormFillSetting } from "@/features/Settings/types";
import { useEntityQuery } from "@/hooks/useEntityQuery";
import { getFormFillSetting } from "@/services/settingApi";

type KafilLocationRuntimeConfig = NLeafletLocationRuntimeProviderProps["config"];

function KafilLocationProvider({
  children,
  config,
}: Readonly<{ children: React.ReactNode; config: KafilLocationRuntimeConfig }>) {
  const { t } = useTranslation();

  return (
    <NLeafletLocationRuntimeProvider
      config={config}
      geocoder={null}
      unavailableReason={t("operator.families.locationUnavailable")}
      labels={{
        dialogTitle: t("operator.families.pickAddress"),
        dialogDescription: t("operator.families.pickAddressDescription"),
        openMap: t("operator.families.openAddressMap"),
        close: t("operator.families.locationClose"),
        cancel: t("operator.families.locationCancel"),
        confirm: t("operator.families.locationConfirm"),
        clearPin: t("operator.families.locationClearPin"),
        selected: t("operator.families.locationSelected"),
        notSelected: t("operator.families.locationNotSelected"),
        changedAfterPin: t("operator.families.addressChangedAfterPin"),
        loading: t("operator.families.locationLoading"),
        unavailable: t("operator.families.locationUnavailable"),
        retry: t("operator.families.locationRetry"),
        currentLocation: t("operator.families.locationCurrent"),
        zoomIn: t("operator.families.locationZoomIn"),
        zoomOut: t("operator.families.locationZoomOut"),
        mapInstructions: t("operator.families.locationMapInstructions"),
        readyAnnouncement: t("operator.families.locationReady"),
        selectedAnnouncement: t("operator.families.locationSelectedAnnouncement"),
        clearedAnnouncement: t("operator.families.locationCleared"),
        geolocationDenied: t("operator.families.locationDenied"),
        geolocationTimeout: t("operator.families.locationTimeout"),
        providerError: t("operator.families.locationProviderError"),
      }}
    >
      {children}
    </NLeafletLocationRuntimeProvider>
  );
}

function NajmProviders({
  children,
  initialBranding,
  initialDesign,
  initialFormFill,
  initialLanguage,
  locationConfig,
  initialTheme,
  initialTimeZone,
}: Readonly<{
  children: React.ReactNode;
  initialBranding: PublicBranding;
  initialDesign: NajmDesignConfig;
  initialFormFill: FormFillSetting;
  initialLanguage: KafilLocale;
  locationConfig: KafilLocationRuntimeConfig;
  initialTheme: NajmMode;
  initialTimeZone: NajmPreferenceTimeZone<typeof kafilPreferences>;
}>) {
  // Seeded by the layout, so F8 is live on first paint. The read is public by
  // design because the shortcut also serves public forms; only writes require
  // an operator or admin. Other sessions refresh the value on their next focus.
  const formFillSetting = useEntityQuery({
    queryKey: ["settings", "form-fill"] as const,
    queryFn: getFormFillSetting,
    initialData: initialFormFill,
    refetchOnWindowFocus: true,
    staleTime: 60_000,
  });

  return (
    <NajmAppProvider
      i18n={kafilUiI18n}
      appName={APP_NAME}
      badgeDefaults={KAFIL_BADGE_DEFAULTS}
      currency={KAFIL_CURRENCY}
      formDevTools={formFillSetting.data.enabled}
      initialBranding={initialBranding}
      initialDesign={initialDesign}
      initialLanguage={initialLanguage}
      initialTheme={initialTheme}
      initialTimeZone={initialTimeZone}
    >
      <NThemeBrandingProvider branding={initialBranding}>
        <KafilLocationProvider config={locationConfig}>{children}</KafilLocationProvider>
      </NThemeBrandingProvider>
    </NajmAppProvider>
  );
}

export function AppProviders({
  children,
  initialBranding,
  initialDesign,
  initialFormFill,
  initialLanguage,
  locationConfig,
  initialSession,
  initialTheme,
  initialTimeZone,
}: Readonly<{
  children: React.ReactNode;
  initialBranding: PublicBranding;
  initialDesign: NajmDesignConfig;
  initialFormFill: FormFillSetting;
  initialLanguage: KafilLocale;
  locationConfig: KafilLocationRuntimeConfig;
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
          initialFormFill={initialFormFill}
          initialLanguage={initialLanguage}
          locationConfig={locationConfig}
          initialTheme={initialTheme}
          initialTimeZone={initialTimeZone}
        >
          {children}
        </NajmProviders>
      </QueryProvider>
    </AuthProvider>
  );
}
