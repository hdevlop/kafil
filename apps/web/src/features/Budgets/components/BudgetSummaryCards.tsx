"use client";

import { CalendarDays, CircleDollarSign, LockKeyhole, ReceiptText, WalletCards } from "lucide-react";
import { NStatCard } from "najm-kit";

import { useKafilLanguage } from "@/i18n/KafilLanguageProvider";
import { formatMad } from "@/lib/format";

import type { BudgetSummary } from "../types";

export function BudgetSummaryCards({
  summary,
}: Readonly<{
  summary: BudgetSummary;
}>) {
  const { language, t } = useKafilLanguage();
  const funding = summary.funding;
  const fundingPercent = funding
    ? funding.targetMinor <= 0
      ? 100
      : Math.min(100, Math.round((funding.fundedMinor / funding.targetMinor) * 100))
    : 0;

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
      {funding ? (
        <NStatCard
          icon={CircleDollarSign}
          label={t("operator.budgets.familyActivation")}
          value={formatMad(funding.fundedMinor, language)}
          subtext={
            funding.status === "active"
              ? t("operator.budgets.fundingTargetReached", { percent: fundingPercent })
              : t("operator.budgets.fundingTargetRemaining", {
                  amount: formatMad(funding.remainingMinor, language),
                  percent: fundingPercent,
                })
          }
        />
      ) : null}
      <NStatCard
        icon={WalletCards}
        label={t("operator.budgets.available")}
        value={formatMad(summary.availableMinor, language)}
        subtext={t("operator.budgets.availableDescription")}
      />
      <NStatCard
        icon={LockKeyhole}
        label={t("operator.budgets.reserved")}
        value={formatMad(summary.reservedMinor, language)}
        subtext={t("operator.budgets.reservedDescription")}
      />
      <NStatCard
        icon={CalendarDays}
        label={t("operator.budgets.monthlyLimit")}
        value={formatMad(summary.monthlyLimit?.limitMinor, language)}
        subtext={
          summary.monthlyLimit
            ? t("operator.budgets.appliesFrom", { month: summary.monthlyLimit.month })
            : t("operator.budgets.noMonthlyLimit")
        }
      />
      <NStatCard
        icon={ReceiptText}
        label={t("operator.budgets.spent")}
        value={formatMad(summary.spentMinor, language)}
        subtext={t("operator.budgets.spentDescription")}
      />
    </div>
  );
}
