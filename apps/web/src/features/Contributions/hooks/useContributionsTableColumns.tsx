"use client";

import { useMemo } from "react";
import {
  NAvatar,
  NBadge,
  useNajmFormat,
  type NTableProps,
} from "najm-kit";
import { getPersonImage } from "najm-kit/person-images";

import { useKafilLanguage } from "@/i18n/useKafilLanguage";

import type { ContributionAudience, ContributionListRecord } from "../types";

type Column = NTableProps<ContributionListRecord>["columns"][number];

export function useContributionsTableColumns(
  audience: ContributionAudience,
) {
  const { t } = useKafilLanguage();
  const fmt = useNajmFormat();
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
            <div className="flex min-w-0 items-center gap-3">
              <NAvatar
                src={getPersonImage({ image: sponsorImage, role: "adult", gender: sponsorGender })}
                alt={sponsorName}
                classNames={{ avatar: "bg-muted" }}
              />
              <span className="truncate">{sponsorName}</span>
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
      meta: { hiddenBelow: "2xl" },
    });
    columns.push({
      accessorKey: "amountMinor",
      header: t("operator.contributions.amount"),
      cell: ({ row }) => fmt.money(row.original.amountMinor),
    });
    columns.push({
      accessorKey: "status",
      header: t("operator.contributions.status"),
      cell: ({ getValue }) => <NBadge status={getValue<string>()} />,
    });
    columns.push({
      accessorKey: "submittedAt",
      header: t("operator.contributions.submitted"),
      cell: ({ getValue }) => fmt.date(getValue<string>()),
    });
    return columns;
  }, [audience, fmt, t]);
}
