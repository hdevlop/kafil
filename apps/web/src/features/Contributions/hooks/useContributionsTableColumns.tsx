"use client";

import { useMemo } from "react";
import { NAvatar, type NTableProps } from "najm-kit";

import { formatKafilDate, formatMad } from "@/lib/format";
import { useKafilLanguage } from "@/i18n/KafilLanguageProvider";
import { getSponsorAvatarImage } from "@/lib/personImages";
import { StatusBadge } from "@/shared/StatusBadge";

import type { ContributionRecord } from "../types";

export function useContributionsTableColumns() {
  const { t } = useKafilLanguage();
  return useMemo<NTableProps<ContributionRecord>["columns"]>(
    () => [
      {
        accessorKey: "sponsorName",
        header: t("operator.assignments.sponsor"),
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <NAvatar
              src={getSponsorAvatarImage(
                row.original.sponsorImage,
                row.original.sponsorGender,
              )}
              alt={row.original.sponsorName}
              classNames={{ avatar: "bg-muted" }}
            />
            <span>{row.original.sponsorName}</span>
          </div>
        ),
      },
      {
        accessorKey: "familyName",
        header: t("operator.assignments.family"),
      },
      {
        accessorKey: "paymentMethod",
        header: t("operator.contributions.paymentMethod"),
      },
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
    ],
    [t],
  );
}
