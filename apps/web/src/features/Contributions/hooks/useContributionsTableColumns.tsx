"use client";

import { useMemo, type ReactNode } from "react";
import { type NTableProps } from "najm-kit";

import { formatKafilDate, formatMad } from "@/lib/format";
import { useKafilLanguage } from "@/i18n/KafilLanguageProvider";
import { getSponsorAvatarImage } from "@/lib/personImages";
import { ManagedAvatar } from "@/shared/ManagedAvatar";
import { StatusBadge } from "@/shared/StatusBadge";

import type { ContributionAudience, ContributionListRecord, ContributionRecord } from "../types";

function isManagement(record: ContributionListRecord): record is ContributionRecord {
  return "sponsorName" in record;
}

export function useContributionsTableColumns(
  audience: ContributionAudience,
  renderActions: (record: ContributionListRecord) => ReactNode,
) {
  const { t } = useKafilLanguage();
  return useMemo<NTableProps<ContributionListRecord>["columns"]>(
    () => [
      ...(audience === "management" ? [
        {
          accessorKey: "sponsorName",
          header: t("operator.assignments.sponsor"),
          cell: ({ row }: { row: { original: ContributionListRecord } }) => {
            const record = row.original;
            if (!isManagement(record)) return null;
            return (
              <div className="flex items-center gap-3">
                <ManagedAvatar
                  src={getSponsorAvatarImage(record.sponsorImage, record.sponsorGender)}
                  alt={record.sponsorName}
                  classNames={{ avatar: "bg-muted" }}
                />
                <span>{record.sponsorName}</span>
              </div>
            );
          },
        },
        { accessorKey: "familyName", header: t("operator.assignments.family") },
        { accessorKey: "paymentMethod", header: t("operator.contributions.paymentMethod") },
      ] : []),
      {
        accessorKey: "externalReference",
        header: t("operator.contributions.reference"),
        cell: ({ getValue }) => getValue<string | null>() || "—",
      },
      {
        accessorKey: "amountMinor",
        header: t("operator.contributions.amount"),
        cell: ({ row }) => formatMad(row.original.amountMinor),
      },
      {
        accessorKey: "status",
        header: t("operator.contributions.status"),
        cell: ({ getValue }) => <StatusBadge status={getValue<string>()} />,
      },
      {
        accessorKey: "submittedAt",
        header: t("operator.contributions.submitted"),
        cell: ({ getValue }) => formatKafilDate(getValue<string>()),
      },
      {
        id: "actions",
        header: t("common.actions"),
        enableSorting: false,
        cell: ({ row }) => renderActions(row.original),
      },
    ],
    [audience, renderActions, t],
  );
}
