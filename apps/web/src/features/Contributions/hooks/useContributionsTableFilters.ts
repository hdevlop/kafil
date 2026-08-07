"use client";

import { useMemo, type Dispatch, type SetStateAction } from "react";

import { useKafilLanguage } from "@/i18n/useKafilLanguage";

import type { ContributionListQuery } from "../types";

type ContributionFilters = Omit<ContributionListQuery, "limit" | "offset" | "audience">;

export function useContributionsTableFilters(
  filters: ContributionFilters,
  setFilters: Dispatch<SetStateAction<ContributionFilters>>,
) {
  const { t } = useKafilLanguage();

  return useMemo(() => [
    {
      type: "text" as const,
      name: "search",
      placeholder: t("operator.contributions.filterFamily"),
      value: filters.search ?? "",
      onChange: (search: string) => setFilters((current) => ({ ...current, search: search || undefined })),
    },
    {
      type: "select" as const,
      showIcon: false,
      name: "paymentMethod",
      placeholder: t("operator.contributions.filterPaymentMethod"),
      value: filters.paymentMethod ?? "",
      onChange: (paymentMethod: string) => setFilters((current) => ({ ...current, paymentMethod: paymentMethod || undefined })),
      options: [
        { value: "cash", label: t("operator.contributions.cash") },
        { value: "bank_transfer", label: t("operator.contributions.bankTransfer") },
        { value: "cheque", label: t("operator.contributions.cheque") },
        { value: "mobile_transfer", label: t("operator.contributions.mobileTransfer") },
        { value: "other", label: t("operator.contributions.other") },
      ],
    },
    {
      type: "select" as const,
      showIcon: false,
      name: "status",
      placeholder: t("operator.contributions.filterStatus"),
      value: filters.status ?? "",
      onChange: (status: ContributionListQuery["status"] | "") => setFilters((current) => ({ ...current, status: status || undefined })),
      options: [
        { value: "pending", label: t("status.pending") },
        { value: "validated", label: t("operator.contributions.validated") },
        { value: "rejected", label: t("status.rejected") },
        { value: "refunded", label: t("status.refunded") },
        { value: "expired", label: t("status.expired") },
      ],
    },
  ], [filters.paymentMethod, filters.search, filters.status, setFilters, t]);
}
