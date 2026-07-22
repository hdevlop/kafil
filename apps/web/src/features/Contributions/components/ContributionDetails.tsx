"use client";

import { CreditCard, Landmark, ReceiptText } from "lucide-react";
import { NDetailList, NSection } from "najm-kit";

import { formatKafilDate, formatMad } from "@/lib/format";
import { useKafilLanguage } from "@/i18n/KafilLanguageProvider";
import { StatusBadge } from "@/shared/StatusBadge";

import type { ContributionRecord } from "../types";

function reference(value: string | null, notLinked: string) {
  return value ? value.slice(0, 8) : notLinked;
}

export function ContributionDetails({
  contribution,
}: Readonly<{ contribution: ContributionRecord }>) {
  const { t } = useKafilLanguage();
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4 rounded-2xl bg-muted/60 p-4">
        <div>
          <p className="text-xl font-semibold">
            {formatMad(contribution.amountMinor)}
          </p>
          <p className="text-sm text-muted-foreground">
            {contribution.paymentMethod}
          </p>
        </div>
        <StatusBadge status={contribution.status} />
      </div>

      <NSection icon={ReceiptText} title={t("operator.contributions.paymentRecord")}>
        <NDetailList
          items={[
            {
              label: t("operator.contributions.externalReference"),
              value: contribution.externalReference || t("operator.contributions.notProvided"),
            },
            { label: t("operator.contributions.submitted"), value: formatKafilDate(contribution.submittedAt) },
            { label: t("operator.contributions.paid"), value: formatKafilDate(contribution.paidAt) },
            { label: t("operator.contributions.validated"), value: formatKafilDate(contribution.validatedAt) },
            { label: t("operator.contributions.rejected"), value: formatKafilDate(contribution.rejectedAt) },
            {
              label: t("operator.contributions.rejectionReason"),
              value: contribution.rejectionReason || t("operator.contributions.notRejected"),
            },
          ]}
        />
      </NSection>

      <NSection icon={CreditCard} title={t("operator.contributions.supportLinkage")}>
        <NDetailList
          items={[
            {
              label: t("operator.contributions.supportAssignment"),
              value: reference(contribution.supportAssignmentId, t("operator.contributions.notLinked")),
            },
            {
              label: t("operator.contributions.contributionPlan"),
              value: reference(contribution.contributionPlanId, t("operator.contributions.notLinked")),
            },
            {
              label: t("operator.assignments.sponsor"),
              value: `${contribution.sponsorName} — ${contribution.sponsorEmail}`,
            },
          ]}
        />
      </NSection>

      <NSection icon={Landmark} title={t("operator.contributions.budgetDestination")}>
        <NDetailList
          items={[
            {
              label: t("operator.assignments.family"),
              value: contribution.familyName,
            },
          ]}
        />
      </NSection>
    </div>
  );
}
