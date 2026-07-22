"use client";

import { ClipboardCheck, HandCoins, HeartHandshake, LayoutDashboard, WalletCards } from "lucide-react";
import { NCard, NGrid, NGridItem, NPageHeaderActions, NPageLayout, NStatCard } from "najm-kit";
import Link from "next/link";

import { useKafilLanguage } from "@/i18n/KafilLanguageProvider";
import { formatKafilDate, formatKafilNumber, formatMad, formatStatusLabel } from "@/lib/format";
import { PageErrorState } from "@/shared/PageState";
import PageHeaderGlobalActions from "@/shared/PageHeaderGlobalActions";
import { DashboardPageHeader as NPageHeader } from "@/shared/DashboardShell/DashboardPageHeader";
import { StatusBadge } from "@/shared/StatusBadge";

import { useSponsorDashboard } from "../hooks/useDashboard";
import { DonutBreakdown, MonthlyBarChart, StatusBreakdown } from "./DashboardCharts";

export function SponsorDashboardPage() {
  const dashboard = useSponsorDashboard();
  const { language, t } = useKafilLanguage();

  if (dashboard.isError) {
    return <PageErrorState error={dashboard.error} title={t("dashboard.sponsor.error")} onRetry={() => void dashboard.refetch()} />;
  }
  if (dashboard.isPending || !dashboard.data) {
    return <NCard loading title={t("dashboard.sponsor.loading")} />;
  }

  const data = dashboard.data;
  const number = (value: number) => formatKafilNumber(value, language);
  const money = (value: number) => formatMad(value, language);

  return (
    <NPageLayout className="flex min-h-full flex-col gap-4">
      <NPageHeader
        icon={LayoutDashboard}
        title={t("dashboard.sponsor.welcome", { name: data.displayName })}
        subtitle={t("dashboard.sponsor.subtitle")}
      >
        <NPageHeaderActions>
          <PageHeaderGlobalActions />
        </NPageHeaderActions>
      </NPageHeader>

      <NGrid cols={2} lgCols={3} xlCols={6}>
        <NGridItem span={1}>
          <NStatCard variant="compact" icon={HandCoins} label={t("dashboard.sponsor.validatedContributions")} value={money(data.money.validatedContributionMinor)} className="sm:hidden" />
          <NStatCard icon={HandCoins} label={t("dashboard.sponsor.validatedContributions")} value={money(data.money.validatedContributionMinor)} className="hidden sm:block" />
        </NGridItem>
        <NGridItem span={1}>
          <NStatCard variant="compact" icon={HandCoins} label={t("dashboard.sponsor.pendingContributions")} value={money(data.money.pendingContributionMinor)} className="sm:hidden" />
          <NStatCard icon={HandCoins} label={t("dashboard.sponsor.pendingContributions")} value={money(data.money.pendingContributionMinor)} className="hidden sm:block" />
        </NGridItem>
        <NGridItem span={1}>
          <NStatCard variant="compact" icon={HeartHandshake} label={t("dashboard.sponsor.activeAssignments")} value={number(data.counts.activeAssignments)} className="sm:hidden" />
          <NStatCard icon={HeartHandshake} label={t("dashboard.sponsor.activeAssignments")} value={number(data.counts.activeAssignments)} className="hidden sm:block" />
        </NGridItem>
        <NGridItem span={1}>
          <NStatCard variant="compact" icon={HandCoins} label={t("dashboard.sponsor.activePlans")} value={number(data.counts.activePlans)} className="sm:hidden" />
          <NStatCard icon={HandCoins} label={t("dashboard.sponsor.activePlans")} value={number(data.counts.activePlans)} className="hidden sm:block" />
        </NGridItem>
        <NGridItem span={1}>
          <NStatCard variant="compact" icon={WalletCards} label={t("dashboard.sponsor.availableSupportBudget")} value={money(data.money.supportedAvailableMinor)} className="sm:hidden" />
          <NStatCard icon={WalletCards} label={t("dashboard.sponsor.availableSupportBudget")} value={money(data.money.supportedAvailableMinor)} className="hidden sm:block" />
        </NGridItem>
        <NGridItem span={1}>
          <NStatCard variant="compact" icon={ClipboardCheck} label={t("dashboard.sponsor.supportedOrders")} value={number(data.counts.supportedOrders)} className="sm:hidden" />
          <NStatCard icon={ClipboardCheck} label={t("dashboard.sponsor.supportedOrders")} value={number(data.counts.supportedOrders)} className="hidden sm:block" />
        </NGridItem>
      </NGrid>

      <NGrid cols={1} xlCols={12}>
        <NGridItem span={1} xlSpan={8}>
          <MonthlyBarChart
            data={data.contributionTrend}
            icon={HandCoins}
            language={language}
            series={[
              { key: "validatedMinor", label: t("dashboard.common.validated"), color: "var(--primary)" },
              { key: "pendingMinor", label: t("dashboard.common.pending"), color: "var(--secondary)" },
            ]}
            title={t("dashboard.sponsor.contributionTrend")}
            valueFormatter={money}
          />
        </NGridItem>
        <NGridItem span={1} xlSpan={4}>
          <DonutBreakdown
            data={[
              { label: t("dashboard.common.available"), value: data.money.supportedAvailableMinor, color: "var(--primary)" },
              { label: t("dashboard.common.reserved"), value: data.money.supportedReservedMinor, color: "var(--secondary)" },
              { label: t("dashboard.common.spent"), value: data.money.supportedSpentMinor, color: "var(--destructive)" },
            ]}
            icon={WalletCards}
            totalLabel={t("family.cart.total")}
            title={t("dashboard.sponsor.supportBudgetUse")}
            valueFormatter={money}
          />
        </NGridItem>
      </NGrid>

      <NGrid cols={1} lgCols={2} className="flex-1">
        <NGridItem span={1}>
          <StatusBreakdown
            data={data.contributionStatuses}
            emptyLabel={t("state.empty")}
            icon={HandCoins}
            labelForStatus={(status) => formatStatusLabel(status, language)}
            language={language}
            title={t("dashboard.sponsor.contributionStatuses")}
          />
        </NGridItem>
        <NGridItem span={1}>
          <NCard icon={HandCoins} title={t("dashboard.sponsor.recentContributions")}>
            <div className="space-y-2">
              {data.recentContributions.length ? data.recentContributions.map((contribution) => (
                <Link className="flex items-center justify-between gap-3 rounded-xl border border-border/70 p-3 hover:bg-muted/60" href="/sponsor/contributions" key={contribution.id}>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">{money(contribution.amountMinor)}</span>
                    <span className="block text-xs text-muted-foreground">{formatKafilDate(contribution.submittedAt, language)}</span>
                  </span>
                  <StatusBadge status={contribution.status} />
                </Link>
              )) : <p className="py-10 text-center text-sm text-muted-foreground">{t("dashboard.sponsor.noContributions")}</p>}
            </div>
          </NCard>
        </NGridItem>
      </NGrid>
    </NPageLayout>
  );
}
