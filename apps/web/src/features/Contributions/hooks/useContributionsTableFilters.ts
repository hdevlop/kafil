"use client";

import { useMemo } from "react";

import { useFamilies } from "@/features/Families/hooks/useFamilies";
import { useSponsors } from "@/features/Sponsors/hooks/useSponsors";
import { useKafilLanguage } from "@/i18n/KafilLanguageProvider";

function uniqueOptions(values: string[]) {
  return [...new Set(values.filter(Boolean))].map((value) => ({
    value,
    label: value,
  }));
}

export function useContributionsTableFilters() {
  const { t } = useKafilLanguage();
  const families = useFamilies({ limit: 100, offset: 0 });
  const sponsors = useSponsors({ limit: 100, offset: 0 });

  return useMemo(
    () => [
      {
        type: "combobox" as const,
        name: "familyName",
        placeholder: t("operator.contributions.filterFamily"),
        options: uniqueOptions(
          (families.data ?? []).map((f) => f.guardianLegalName),
        ),
      },
      {
        type: "combobox" as const,
        name: "sponsorName",
        placeholder: t("operator.contributions.filterSponsor"),
        options: uniqueOptions(
          (sponsors.data ?? []).map((s) => s.name),
        ),
      },
      {
        type: "select" as const,
        name: "paymentMethod",
        placeholder: t("operator.contributions.filterPaymentMethod"),
        options: [
          { value: "cash", label: t("operator.contributions.cash") },
          { value: "bank_transfer", label: t("operator.contributions.bankTransfer") },
          { value: "cheque", label: t("operator.contributions.cheque") },
          { value: "mobile_transfer", label: t("operator.contributions.mobileTransfer") },
          { value: "other", label: t("operator.contributions.other") },
        ],
      },
      {
        type: "text" as const,
        name: "externalReference",
        placeholder: t("operator.contributions.searchReference"),
      },
      {
        type: "select" as const,
        name: "status",
        placeholder: t("operator.contributions.filterStatus"),
        options: [
          { value: "pending", label: t("status.pending") },
          { value: "validated", label: t("operator.contributions.validated") },
          { value: "rejected", label: t("status.rejected") },
          { value: "refunded", label: t("status.refunded") },
        ],
      },
    ],
    [families.data, sponsors.data, t],
  );
}
