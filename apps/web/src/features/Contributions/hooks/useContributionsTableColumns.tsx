"use client";

import { useMemo } from "react";
import { type NTableProps } from "najm-kit";

import { formatKafilDate, formatMad } from "@/lib/format";
import { useKafilLanguage } from "@/i18n/KafilLanguageProvider";
import { getSponsorAvatarImage } from "@/lib/personImages";
import { ManagedAvatar } from "@/shared/ManagedAvatar";
import { StatusBadge } from "@/shared/StatusBadge";

import type { ContributionAudience, ContributionListRecord } from "../types";

type Column = NTableProps<ContributionListRecord>["columns"][number];

export function useContributionsTableColumns(
  audience: ContributionAudience,
) {
  const { t } = useKafilLanguage();
  return useMemo<NTableProps<ContributionListRecord>["columns"]>(() => {
    const columns: Column[] = [];

    if (audience === "family" || audience === "sponsor" || audience === "management") {
      columns.push({
        accessorKey: "sponsorName",
        header: t("operator.assignments.sponsor"),
        cell: ({ row }) => {
          const record = row.original;
          const sponsorName =
            "sponsorName" in record && record.sponsorName
              ? record.sponsorName
              : audience === "sponsor"
                ? t("common.you")
                : "";
          const sponsorImage =
            "sponsorImage" in record ? record.sponsorImage ?? null : null;
          const sponsorGender =
            "sponsorGender" in record ? record.sponsorGender ?? null : null;
          return (
            <div className="flex items-center gap-3">
              <ManagedAvatar
                src={getSponsorAvatarImage(sponsorImage, sponsorGender)}
                alt={sponsorName}
                classNames={{ avatar: "bg-muted" }}
              />
              <span>{sponsorName}</span>
            </div>
          );
        },
      });
    }

    if (audience === "management" || audience === "sponsor") {
      columns.push({
        accessorKey: "familyName",
        header: t("operator.assignments.family"),
      });
      columns.push({
        accessorKey: "paymentMethod",
        header: t("operator.contributions.paymentMethod"),
      });
    }

    columns.push({
      accessorKey: "externalReference",
      header: t("operator.contributions.reference"),
      cell: ({ getValue }) => getValue<string | null>() || "—",
    });
    columns.push({
      accessorKey: "amountMinor",
      header: t("operator.contributions.amount"),
      cell: ({ row }) => formatMad(row.original.amountMinor),
    });
    columns.push({
      accessorKey: "status",
      header: t("operator.contributions.status"),
      cell: ({ getValue }) => <StatusBadge status={getValue<string>()} />,
    });
    columns.push({
      accessorKey: "submittedAt",
      header: t("operator.contributions.submitted"),
      cell: ({ getValue }) => formatKafilDate(getValue<string>()),
    });
    return columns;
  }, [audience, t]);
}
