"use client";

import { useMemo } from "react";
import { NAvatar, type NTableProps } from "najm-kit";

import { formatKafilDate } from "@/lib/format";
import { getFamilyAvatarImage } from "@/lib/personImages";
import { StatusBadge } from "@/shared/StatusBadge";
import { FundingProgressBar } from "@/shared/FundingProgressCard";
import { useKafilLanguage } from "@/i18n/KafilLanguageProvider";

import type { FamilyRecord } from "../types";

export function useFamiliesTableColumns() {
  const { t } = useKafilLanguage();
  return useMemo<NTableProps<FamilyRecord>["columns"]>(
    () => [
      {
        accessorKey: "name",
        header: t("operator.families.account"),
        cell: ({ row }) => (
          <NAvatar
            src={getFamilyAvatarImage(
              row.original.image,
              row.original.relationshipToChildren,
            )}
            title={row.original.name}
            classNames={{ avatar: "bg-muted" }}
          />
        ),
      },
      {
        accessorKey: "email",
        header: t("operator.families.email"),
      },
      {
        accessorKey: "guardianLegalName",
        header: t("operator.families.guardian"),
      },
      {
        accessorKey: "phone",
        header: t("operator.families.phone"),
        cell: ({ getValue }) => getValue<string | null>() || "—",
      },
      {
        accessorKey: "relationshipToChildren",
        header: t("operator.families.relationship"),
        cell: ({ getValue }) => getValue<string | null>() || "—",
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
      },
    ],
    [t],
  );
}
