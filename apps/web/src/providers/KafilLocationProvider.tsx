"use client";

import {
  NLeafletLocationRuntimeProvider,
  type NLeafletLocationRuntimeProviderProps,
} from "najm-kit/location/runtime/leaflet";
import { useTranslation } from "najm-i18n/react";

type KafilLocationRuntimeConfig =
  NLeafletLocationRuntimeProviderProps["config"];

export function KafilLocationProvider({
  children,
  config,
}: Readonly<{
  children: React.ReactNode;
  config: KafilLocationRuntimeConfig;
}>) {
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
        selectedAnnouncement: t(
          "operator.families.locationSelectedAnnouncement",
        ),
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
