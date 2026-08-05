"use client";

import { useMemo, type Dispatch, type SetStateAction } from "react";

import { useKafilLanguage } from "@/i18n/KafilLanguageProvider";

import type {
  AccessRoleName,
  AccessUserListQuery,
  AccessUserStatus,
} from "../types";

export function useAdminUsersTableFilters(
  query: AccessUserListQuery,
  setQuery: Dispatch<SetStateAction<AccessUserListQuery>>,
) {
  const { t } = useKafilLanguage();

  return useMemo(
    () => [
      {
        type: "text",
        name: "search",
        placeholder: t("adminAccess.users.search"),
        value: query.search ?? "",
        onChange: (search: string) =>
          setQuery((current) => ({
            ...current,
            search: search || undefined,
            offset: 0,
          })),
      },
      {
        type: "select",
        showIcon: false,
        name: "role",
        placeholder: t("adminAccess.users.allRoles"),
        value: query.role ?? "",
        options: [
          { value: "admin", label: t("adminAccess.users.admin") },
          { value: "operator", label: t("adminAccess.users.operator") },
          { value: "family", label: t("adminAccess.users.family") },
          { value: "sponsor", label: t("adminAccess.users.sponsor") },
        ],
        onChange: (role: AccessRoleName | "") =>
          setQuery((current) => ({
            ...current,
            role: role || undefined,
            offset: 0,
          })),
      },
      {
        type: "select",
        showIcon: false,
        name: "status",
        placeholder: t("adminAccess.users.allStatuses"),
        value: query.status ?? "",
        options: [
          { value: "active", label: t("status.active") },
          { value: "inactive", label: t("status.inactive") },
          { value: "pending", label: t("status.pending") },
        ],
        onChange: (status: AccessUserStatus | "") =>
          setQuery((current) => ({
            ...current,
            status: status || undefined,
            offset: 0,
          })),
      },
      {
        type: "select",
        showIcon: false,
        name: "verified",
        placeholder: t("adminAccess.users.anyVerification"),
        value: query.verified === undefined ? "" : String(query.verified),
        options: [
          { value: "true", label: t("adminAccess.users.verified") },
          { value: "false", label: t("adminAccess.users.notVerified") },
        ],
        onChange: (verified: "true" | "false" | "") =>
          setQuery((current) => ({
            ...current,
            verified: verified === "" ? undefined : verified === "true",
            offset: 0,
          })),
      },
    ],
    [query.role, query.search, query.status, query.verified, setQuery, t],
  );
}
