"use client";

import { useMemo } from "react";

import { useFamilies } from "@/features/Families/hooks/useFamilies";
import { useSponsors } from "@/features/Sponsors/hooks/useSponsors";
import { useKafilLanguage } from "@/i18n/KafilLanguageProvider";

import type { ContributionListRecord } from "../types";

function uniqueOptions(values: string[]) {
  return [...new Set(values.filter(Boolean))].map((value) => ({
    value,
    label: value,
  }));
}

export function useContributionsTableFilters(
  audience: "management" | "family" | "sponsor",
  rows: ContributionListRecord[],
) {
  const { t } = useKafilLanguage();
  const management = audience === "management";
  const sharedTable = management || audience === "sponsor";
  const families = useFamilies({ limit: 100, offset: 0 }, {}, management);
  const sponsors = useSponsors({ limit: 100, offset: 0 }, management);

  return useMemo(() => {
      const familyNames = management
        ? (families.data ?? []).map((family) => family.guardianLegalName)
        : rows.flatMap((record) =>
            "familyName" in record ? [record.familyName] : [],
          );
      const sponsorNames = management
        ? (sponsors.data ?? []).map((sponsor) => sponsor.name)
        : rows.flatMap((record) =>
            "sponsorName" in record ? [record.sponsorName] : [],
          );

    return [
      ...(sharedTable
        ? [
            {
              type: "combobox" as const,
              name: "familyName",
              placeholder: t("operator.contributions.filterFamily"),
              options: uniqueOptions(familyNames),
            },
            {
              type: "combobox" as const,
              name: "sponsorName",
              placeholder: t("operator.contributions.filterSponsor"),
              options: uniqueOptions(sponsorNames),
            },
            {
              type: "select" as const,
              name: "paymentMethod",
              placeholder: t("operator.contributions.filterPaymentMethod"),
              options: [
                { value: "cash", label: t("operator.contributions.cash") },
                {
                  value: "bank_transfer",
                  label: t("operator.contributions.bankTransfer"),
                },
                { value: "cheque", label: t("operator.contributions.cheque") },
                {
                  value: "mobile_transfer",
                  label: t("operator.contributions.mobileTransfer"),
                },
                { value: "other", label: t("operator.contributions.other") },
              ],
            },
          ]
        : []),
      {
        type: "select" as const,
        name: "status",
        placeholder: t("operator.contributions.filterStatus"),
        options: [
          { value: "pending", label: t("status.pending") },
          { value: "validated", label: t("operator.contributions.validated") },
          { value: "rejected", label: t("status.rejected") },
          { value: "refunded", label: t("status.refunded") },
          { value: "expired", label: t("status.expired") },
        ],
      },
      ];
  }, [families.data, management, rows, sharedTable, sponsors.data, t]);
}
