"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "najm-auth/client/react";
import { NajmAppProvider } from "najm-kit/app";
import {
  NLeafletLocationRuntimeProvider,
  type NLeafletLocationRuntimeProviderProps,
} from "najm-kit/location/runtime/leaflet";
import {
  bindNajmNextProvider,
  NajmNextAppProvider,
  type NajmNextProviderContext,
} from "najm-next/app/react";
import { NThemeBrandingProvider } from "najm-theme/react";
import { useTranslation } from "najm-i18n/react";

import { KAFIL_BADGE_DEFAULTS } from "@/features/StatusLabels";
import { useEntityQuery } from "@/hooks/useEntityQuery";
import { auth } from "@/najm.auth";
import type { KafilUiSnapshot } from "@/najm.server";
import { getApiErrorStatus } from "@/services/apiError";
import { getFormFillSetting } from "@/services/settingApi";
import { APP_NAME } from "@/types/branding";
import { kafilUiI18n } from "@kafil/server/locales";
import { KAFIL_CURRENCY } from "@kafil/server/money";

type KafilLocationRuntimeConfig = NLeafletLocationRuntimeProviderProps["config"];

type ProviderContext = NajmNextProviderContext<KafilUiSnapshot, QueryClient>;

function shouldRetry(failureCount: number, error: unknown) {
  if (failureCount >= 1) return false;
  const status = getApiErrorStatus(error);
  return status === undefined || status >= 500;
}

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        gcTime: 10 * 60_000,
        refetchOnWindowFocus: false,
        retry: shouldRetry,
      },
      mutations: { retry: false },
    },
  });
}

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

function KafilUiProvider({
  children,
  snapshot,
}: Readonly<{ children: React.ReactNode; snapshot: KafilUiSnapshot }>) {
  const formFillSetting = useEntityQuery({
    queryKey: ["settings", "form-fill"] as const,
    queryFn: getFormFillSetting,
    initialData: snapshot.settings.formFill,
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
      initialBranding={snapshot.branding}
      initialDesign={snapshot.appearance.designConfig}
      initialLanguage={snapshot.preferences.language}
      initialTheme={snapshot.preferences.theme}
      initialTimeZone={snapshot.preferences.timeZone}
    >
      {children}
    </NajmAppProvider>
  );
}

const authProvider = bindNajmNextProvider(
  AuthProvider,
  ({ snapshot }: ProviderContext) => ({
    client: auth.client,
    initialSession: snapshot.session,
  }),
);

const queryProvider = bindNajmNextProvider(
  QueryClientProvider,
  ({ queryClient }: ProviderContext) => ({ client: queryClient! }),
);

const uiProvider = bindNajmNextProvider(
  KafilUiProvider,
  ({ snapshot }: ProviderContext) => ({ snapshot }),
);

const brandingProvider = bindNajmNextProvider(
  NThemeBrandingProvider,
  ({ snapshot }: ProviderContext) => ({ branding: snapshot.branding }),
);

const locationProvider = bindNajmNextProvider(
  KafilLocationProvider,
  ({ snapshot }: ProviderContext) => ({
    config: snapshot.settings.locationConfig,
  }),
);

const providers = {
  auth: authProvider,
  query: queryProvider,
  ui: uiProvider,
  branding: brandingProvider,
  location: locationProvider,
} as const;

export function AppProviders({
  children,
  snapshot,
}: Readonly<{ children: React.ReactNode; snapshot: KafilUiSnapshot }>) {
  return (
    <NajmNextAppProvider
      snapshot={snapshot}
      createQueryClient={createQueryClient}
      providers={providers}
    >
      {children}
    </NajmNextAppProvider>
  );
}
