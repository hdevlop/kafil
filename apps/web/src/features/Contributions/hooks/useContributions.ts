"use client";

import { keepPreviousData } from "@tanstack/react-query";
import { useUser } from "najm-auth/client/react";

import { useEntityCommand } from "@/hooks/useEntityCommand";
import { useEntityQuery } from "@/hooks/useEntityQuery";
import { useOffsetInfiniteQuery } from "@/hooks/useOffsetInfiniteQuery";
import { useKafilLanguage } from "@/i18n/KafilLanguageProvider";
import {
  bulkDeleteContributions,
  deleteContribution,
  listAllContributions,
  listContributionPage,
  listContributions,
  listContributionRecordingOptions,
  recordContribution,
  refundContribution,
  rejectContribution,
  validateContribution,
} from "@/services/contributionApi";

import { contributionInvalidation } from "./contributionInvalidation";
import { contributionKeys } from "./contributionKeys";
import type { ContributionListQuery, ContributionListRecord, ContributionRecord } from "../types";

export function useContributions<TRecord extends ContributionListRecord = ContributionRecord>(query: ContributionListQuery, enabled = true) {
  const user = useUser();
  const isFamily = user?.role === "family";
  const isSponsor = user?.role === "sponsor";
  return useEntityQuery({
    queryKey: contributionKeys.list({ ...query, role: user?.role }),
    queryFn: () => {
      if (isFamily || isSponsor) {
        return listContributions<TRecord>({ ...query, audience: isSponsor ? "sponsor" : "family" });
      }
      return listContributions<TRecord>(query);
    },
    enabled: Boolean(user) && enabled,
  });
}

export function useContributionPage<TRecord extends ContributionListRecord = ContributionRecord>(
  query: ContributionListQuery,
  enabled = true,
) {
  const user = useUser();
  const audience = user?.role === "sponsor"
    ? "sponsor"
    : user?.role === "family"
      ? "family"
      : query.audience;

  return useEntityQuery({
    queryKey: contributionKeys.page({ ...query, audience, role: user?.role }),
    queryFn: () => listContributionPage<TRecord>({ ...query, audience }),
    enabled: Boolean(user) && enabled,
    placeholderData: keepPreviousData,
  });
}

export function useAllContributions<TRecord extends ContributionListRecord = ContributionRecord>(
  query: Omit<ContributionListQuery, "limit" | "offset">,
  enabled = true,
) {
  const user = useUser();
  const isSponsor = user?.role === "sponsor";
  const audience = isSponsor
    ? "sponsor"
    : user?.role === "family"
      ? "family"
      : query.audience;

  return useEntityQuery({
    queryKey: contributionKeys.full({ ...query, audience, role: user?.role }),
    queryFn: () => listAllContributions<TRecord>({ ...query, audience }),
    enabled: Boolean(user) && enabled,
  });
}

export function useInfiniteContributions<
  TRecord extends ContributionListRecord = ContributionRecord,
>(
  query: Omit<ContributionListQuery, "limit" | "offset">,
  enabled = true,
) {
  const user = useUser();
  const audience = user?.role === "sponsor"
    ? "sponsor"
    : user?.role === "family"
      ? "family"
      : query.audience;

  return useOffsetInfiniteQuery<TRecord>({
    enabled: Boolean(user) && enabled,
    queryKey: contributionKeys.full({ ...query, audience, role: user?.role }),
    fetchPage: (pagination) => listContributions<TRecord>({
      ...query,
      ...pagination,
      audience,
    }),
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
