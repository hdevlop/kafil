"use client";

import { useMemo, type Dispatch, type SetStateAction } from "react";

import { useTranslation } from "najm-i18n/react";

import type { ListApplicantsParams } from "../services/api";

type ApplicantFilters = Omit<ListApplicantsParams, "limit" | "offset">;

export function useApplicantsTableFilters(
  query: ApplicantFilters,
  setQuery: Dispatch<SetStateAction<ApplicantFilters>>,
) {
  const { t } = useTranslation();

  return useMemo(
    () => [
      {
        type: "text",
        name: "search",
        placeholder: t("operator.applicants.searchName"),
        value: query.search ?? "",
        onChange: (search: string) =>
          setQuery((current) => ({
            ...current,
            search: search || undefined,
          })),
      },
      {
        type: "select",
        showIcon: false,
        name: "status",
        placeholder: t("operator.applicants.allStatuses"),
        value: query.status ?? "",
        onChange: (status: ListApplicantsParams["status"] | "") =>
          setQuery((current) => ({
            ...current,
            status: status || undefined,
          })),
        options: [
          {
            value: "pending_review",
            label: t("operator.applicants.pendingReview"),
          },
          {
            value: "pending_email_verification",
            label: t("operator.applicants.pendingEmailVerification"),
          },
          { value: "approved", label: t("operator.applicants.approved") },
          { value: "rejected", label: t("operator.applicants.rejected") },
        ],
      },
    ],
    [query.search, query.status, setQuery, t],
  );
}
