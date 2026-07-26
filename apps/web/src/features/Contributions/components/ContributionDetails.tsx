"use client";

import { useEffect, useState } from "react";
import { CreditCard, Landmark, ReceiptText } from "lucide-react";
import { NDetailList, NSection } from "najm-kit";

import { formatDateTime, formatKafilDate, formatMad } from "@/lib/format";
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
  const [nowMs, setNowMs] = useState<number | null>(null);
  useEffect(() => {
    const updateNow = () => setNowMs(Date.now());
    updateNow();
    const interval = window.setInterval(updateNow, 30_000);
    return () => window.clearInterval(interval);
  }, []);
  const isPending = contribution.status === "pending";
  const isExpired =
    contribution.status === "expired" ||
    (isPending &&
      Boolean(contribution.expiresAt) &&
      nowMs !== null &&
      new Date(contribution.expiresAt!).getTime() <= nowMs);

  const paymentItems = [
    {
      label: t("operator.contributions.externalReference"),
      value: contribution.externalReference || t("operator.contributions.notProvided"),
    },
    {
      label: t("operator.contributions.submitted"),
      value: formatKafilDate(contribution.submittedAt),
    },
    {
      label: t("operator.contributions.paid"),
      value: formatKafilDate(contribution.paidAt),
    },
    {
      label: t("operator.contributions.validated"),
      value: formatKafilDate(contribution.validatedAt),
    },
    {
      label: t("operator.contributions.rejected"),
      value: formatKafilDate(contribution.rejectedAt),
    },
    {
      label: t("operator.contributions.expiredAt"),
      value: formatKafilDate(contribution.expiredAt),
    },
    {
      label: t("operator.contributions.rejectionReason"),
      value: contribution.rejectionReason || t("operator.contributions.notRejected"),
    },
  ];
  if (isPending && contribution.expiresAt) {
    paymentItems.push({
      label: t("operator.contributions.pendingDeadline"),
      value: isExpired
        ? `${formatDateTime(contribution.expiresAt)} (${t("operator.contributions.expired")})`
        : formatDateTime(contribution.expiresAt),
    });
  }

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
        <StatusBadge status={isExpired && isPending ? "expired" : contribution.status} />
      </div>

      <NSection icon={ReceiptText} title={t("operator.contributions.paymentRecord")}>
        <NDetailList items={paymentItems} />
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

      {isExpired ? (
        <p className="rounded-md bg-warning/10 px-3 py-2 text-sm text-warning">
          {t("operator.contributions.expiredWarning")}
        </p>
      ) : null}
    </div>
  );
}
