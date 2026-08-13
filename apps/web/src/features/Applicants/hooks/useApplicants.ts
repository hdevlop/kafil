"use client";

import { useEntityCommand } from "@/hooks/useEntityCommand";
import { useEntityQuery } from "@/hooks/useEntityQuery";
import { useResponsiveOffsetList } from "najm-kit/query";
import { useKafilLanguage } from "@/i18n/useKafilLanguage";
import { sponsorKeys } from "@/features/Sponsors/hooks/sponsorKeys";

import {
  approveApplicant,
  countApplicants,
  deleteApplicant,
  getApplicant,
  listApplicants,
  rejectApplicant,
  type ListApplicantsParams,
} from "../services/api";
import { applicantKeys } from "./applicantKeys";
import type { ApplicantRecord } from "../types";

export function useApplicants(params: ListApplicantsParams = {}) {
  return useEntityQuery({
    queryKey: [...applicantKeys.list(), params],
    queryFn: () => listApplicants(params),
  });
}

export function useResponsiveApplicants(
  params: Omit<ListApplicantsParams, "limit" | "offset"> = {},
) {
  return useResponsiveOffsetList({
    queryKey: [...applicantKeys.list(), "responsive", params],
    fetchPage: (pagination) => listApplicants({ ...params, ...pagination }),
  });
}

export function useApplicant(id: string, initialData?: ApplicantRecord) {
  return useEntityQuery({
    queryKey: applicantKeys.detail(id),
    queryFn: () => getApplicant(id),
    initialData,
  });
}

export function useApplicantPendingReviewCount(enabled = true) {
  return useEntityQuery({
    queryKey: applicantKeys.count("pending_review"),
    queryFn: () => countApplicants("pending_review"),
    enabled,
    staleTime: 15_000,
  });
}

export function useApplicantDecisionCommands() {
  const { t } = useKafilLanguage();
  const invalidate = [applicantKeys.all, sponsorKeys.all];

  const approve = useEntityCommand({
    mutationFn: approveApplicant,
    invalidate,
    successMessage: t("operator.applicants.approveSuccess"),
    errorMessage: t("operator.applicants.approveError"),
  });

  const reject = useEntityCommand({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      rejectApplicant(id, reason),
    invalidate,
    successMessage: t("operator.applicants.rejectSuccess"),
    errorMessage: t("operator.applicants.rejectError"),
  });

  const remove = useEntityCommand({
    mutationFn: deleteApplicant,
    invalidate,
    successMessage: t("operator.applicants.deleteSuccess"),
    errorMessage: t("operator.applicants.deleteError"),
  });

  return { approve, reject, remove };
}
