"use client";

import { useMemo } from "react";
import { usePermissions } from "najm-auth/client/react";
import { type NTableProps } from "najm-kit";

import { formatKafilDate } from "@/lib/format";
import { getFamilyAvatarImage } from "@/lib/personImages";
import { StatusBadge } from "@/shared/StatusBadge";
import { FundingProgressBar } from "@/shared/FundingProgressCard";
import { ManagedAvatar } from "@/shared/ManagedAvatar";
import { useKafilLanguage } from "@/i18n/KafilLanguageProvider";

import type { FamilyRecord } from "../types";

export function useFamiliesTableColumns() {
  const { t } = useKafilLanguage();
  const { hasRole } = usePermissions();
  return useMemo<NTableProps<FamilyRecord>["columns"]>(
    () => [
      {
        accessorKey: "name",
        header: t("operator.families.account"),
        cell: ({ row }) => (
          <ManagedAvatar
            src={getFamilyAvatarImage(row.original.image)}
            title={row.original.name}
            classNames={{ avatar: "bg-muted" }}
          />
        ),
      },
      {
        accessorKey: "email",
        header: t("operator.families.email"),
        meta: {
          visible: hasRole("admin"),
          hiddenBelow: "2xl",
        },
      },
      {
        accessorKey: "phone",
        header: t("operator.families.phone"),
        cell: ({ getValue }) => getValue<string | null>() || "—",
        meta: {
          visible: hasRole("admin"),
          hiddenBelow: "lg",
        },
      },
      {
        accessorKey: "relationshipToChildren",
        header: t("operator.families.relationship"),
        cell: ({ getValue }) => getValue<string | null>() || "—",
        meta: {
          visible: hasRole("admin"),
          hiddenBelow: "lg",
        },
      },
      {
        id: "funding",
        header: t("operator.families.fundingProgress"),
        cell: ({ row }) =>
          row.original.funding ? (
            <div className="w-36">
              <FundingProgressBar compact progress={row.original.funding} />
            </div>
          ) : (
            "—"
          ),
      },
      {
        accessorKey: "status",
        header: t("operator.families.status"),
        cell: ({ getValue }) => <StatusBadge status={getValue<string>()} />,
      },
      {
        accessorKey: "createdAt",
        header: t("operator.families.created"),
        cell: ({ getValue }) => formatKafilDate(getValue<string>()),
        meta: {
          visible: hasRole("admin"),
          hiddenBelow: "lg",
        },
      },
    ],
    [hasRole, t],
  );
}
