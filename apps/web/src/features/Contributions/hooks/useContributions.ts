"use client";

import { useUser } from "najm-auth/client/react";

import { useEntityCommand } from "@/hooks/useEntityCommand";
import { useEntityQuery } from "@/hooks/useEntityQuery";
import { useResponsiveOffsetList } from "@/hooks/useResponsiveOffsetList";
import { useKafilLanguage } from "@/i18n/useKafilLanguage";
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
import type { ContributionListQuery, ContributionListRecord, ContributionRecord } from "../types";

export function useContributions<TRecord extends ContributionListRecord = ContributionRecord>(query: ContributionListQuery, enabled = true) {
  const user = useUser();
  const isFamily = user?.role === "family";
  const isSponsor = user?.role === "sponsor";
  return useEntityQuery({
    queryKey: contributionKeys.list({ ...query, role: user?.role }),
    queryFn: async () => {
      const audience = isSponsor ? "sponsor" : isFamily ? "family" : undefined;
      return (await listContributions<TRecord>(
        audience ? { ...query, audience } : query,
      )).rows;
    },
    enabled: Boolean(user) && enabled,
  });
}

/**
 * The contributions list: numbered pages on desktop, scroll continuation on
 * card viewports, one buffer behind both.
 *
 * This replaces a per-page query that carried its own `hasNextPage` probe. The
 * endpoint reports a result total now, so the page count is the real one rather
 * than the reader's position plus one — which is what made the page bar grow a
 * button on every click.
 */
export function useResponsiveContributions<
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

  return useResponsiveOffsetList<TRecord>({
    enabled: Boolean(user) && enabled,
    queryKey: contributionKeys.full({ ...query, audience, role: user?.role }),
    fetchPage: (pagination) => listContributions<TRecord>({
      ...query,
      ...pagination,
      audience,
    }),
  });
}

export function useContributionRecordingOptions(query: {
  search?: string;
  familyProfileId?: string;
} = {}) {
  return useEntityQuery({
    queryKey: [...contributionKeys.recordingOptions, query],
    queryFn: () => listContributionRecordingOptions(query),
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
