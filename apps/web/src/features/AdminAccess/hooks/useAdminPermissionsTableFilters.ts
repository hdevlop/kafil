"use client";

import { useMemo } from "react";

import { useKafilLanguage } from "@/i18n/KafilLanguageProvider";

import type { AccessPermissionView } from "../types";

export function useAdminPermissionsTableFilters(
  permissions: AccessPermissionView[],
) {
  const { t } = useKafilLanguage();

  return useMemo(
    () => [
      {
        type: "text",
        name: "name",
        placeholder: t("adminAccess.permissions.permission"),
      },
      {
        type: "select",
        name: "resource",
        placeholder: t("adminAccess.permissions.resource"),
        options: [...new Set(permissions.map(({ resource }) => resource))]
          .sort()
          .map((resource) => ({ value: resource, label: resource })),
      },
      {
        type: "select",
        name: "action",
        placeholder: t("adminAccess.permissions.action"),
        options: [...new Set(permissions.map(({ action }) => action))]
          .sort()
          .map((action) => ({ value: action, label: action })),
      },
      {
        type: "select",
        name: "drift",
        placeholder: t("adminAccess.permissions.canonicalState"),
        options: [
          { value: "in_sync", label: t("adminAccess.common.inSync") },
          {
            value: "missing_live_grant",
            label: t("adminAccess.permissions.missingLiveGrant"),
          },
          {
            value: "unexpected_live_grant",
            label: t("adminAccess.permissions.unexpectedLiveGrant"),
          },
          {
            value: "custom",
            label: t("adminAccess.permissions.custom"),
          },
        ],
      },
    ],
    [permissions, t],
  );
}
