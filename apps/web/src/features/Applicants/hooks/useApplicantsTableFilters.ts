"use client";

import { useMemo } from "react";

import { useKafilLanguage } from "@/i18n/KafilLanguageProvider";

export function useApplicantsTableFilters() {
  const { t } = useKafilLanguage();

  return useMemo(
    () => [
      {
        type: "text",
        name: "name",
        placeholder: t("operator.applicants.searchName"),
      },
      {
        type: "text",
        name: "email",
        placeholder: t("operator.applicants.searchEmail"),
      },
      {
        type: "text",
        name: "phone",
        placeholder: t("operator.applicants.searchPhone"),
      },
      {
        type: "select",
        name: "status",
        placeholder: t("operator.applicants.filterStatus"),
        options: [
          {
            value: "pending_email_verification",
            label: t("operator.applicants.pendingEmailVerification"),
          },
          {
            value: "pending_review",
            label: t("operator.applicants.pendingReview"),
          },
          {
            value: "approved",
            label: t("operator.applicants.approved"),
          },
          {
            value: "rejected",
            label: t("operator.applicants.rejected"),
          },
        ],
      },
    ],
    [t],
  );
}
