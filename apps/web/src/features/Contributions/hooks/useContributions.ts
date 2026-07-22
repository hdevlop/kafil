"use client";

import { useEntityCommand } from "@/hooks/useEntityCommand";
import { useEntityQuery } from "@/hooks/useEntityQuery";
import { useKafilLanguage } from "@/i18n/KafilLanguageProvider";
import {
  bulkDeleteContributions,
  deleteContribution,
  listContributions,
  listContributionRecordingOptions,
  recordContribution,
  refundContribution,
  rejectContribution,
  validateContribution,
} from "@/services/contributionApi";

import { contributionInvalidation } from "./contributionInvalidation";
import { contributionKeys } from "./contributionKeys";
import type { ContributionListQuery } from "../types";

export function useContributions(query: ContributionListQuery) {
  return useEntityQuery({
    queryKey: contributionKeys.list(query),
    queryFn: () => listContributions(query),
  });
}

export function useContributionRecordingOptions() {
  return useEntityQuery({
    queryKey: contributionKeys.recordingOptions,
    queryFn: listContributionRecordingOptions,
  });
}

export function useContributionCommands() {
  const { t } = useKafilLanguage();

  const validate = useEntityCommand({
    mutationFn: validateContribution,
    invalidate: [...contributionInvalidation.financial],
    successMessage: t("operator.contributions.validateSuccess"),
    errorMessage: t("operator.contributions.validateError"),
  });

  const record = useEntityCommand({
    mutationFn: recordContribution,
    invalidate: [...contributionInvalidation.contribution],
    successMessage: t("operator.contributions.recordSuccess"),
    errorMessage: t("operator.contributions.recordError"),
  });

  const reject = useEntityCommand({
    mutationFn: rejectContribution,
    invalidate: [...contributionInvalidation.contribution],
    successMessage: t("operator.contributions.rejectSuccess"),
    errorMessage: t("operator.contributions.rejectError"),
  });

  const refund = useEntityCommand({
    mutationFn: refundContribution,
    invalidate: [...contributionInvalidation.financial],
    successMessage: t("operator.contributions.refundSuccess"),
    errorMessage: t("operator.contributions.refundError"),
  });

  const remove = useEntityCommand({
    mutationFn: deleteContribution,
    invalidate: [...contributionInvalidation.financial],
    successMessage: t("operator.contributions.deleteSuccess"),
    errorMessage: t("operator.contributions.deleteError"),
  });

  const bulkRemove = useEntityCommand({
    mutationFn: bulkDeleteContributions,
    invalidate: [...contributionInvalidation.financial],
    successMessage: t("operator.contributions.bulkDeleteSuccess"),
    errorMessage: t("operator.contributions.bulkDeleteError"),
  });

  return { record, validate, reject, refund, remove, bulkRemove };
}
