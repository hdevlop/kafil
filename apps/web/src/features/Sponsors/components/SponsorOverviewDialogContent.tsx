"use client";

import { HandCoins, WalletCards } from "lucide-react";
import { NCard, NGrid, NGridItem, useNajmFormat } from "najm-kit";

import { useKafilLanguage } from "@/i18n/useKafilLanguage";

import { ContributionOverviewCard } from "@/features/Sponsors/components/overview/ContributionOverviewCard";
import { RecentContributionsCard } from "@/features/Sponsors/components/overview/RecentContributionsCard";
import { RecentSupportedOrdersCard } from "@/features/Sponsors/components/overview/RecentSupportedOrdersCard";
import { SponsorKpiGrid } from "@/features/Sponsors/components/overview/SponsorKpiGrid";
import { SupportBudgetCard } from "@/features/Sponsors/components/overview/SupportBudgetCard";

import { useSponsorOverview } from "../hooks/useSponsorOverview";
import { buildOperatorSponsorOverviewViewModel } from "../lib/buildOperatorSponsorOverviewViewModel";
import { SponsorInformationCard } from "./SponsorInformationCard";
import { SponsorOverviewSkeleton } from "./SponsorOverviewSkeleton";

export function SponsorOverviewDialogContent({
  sponsorId,
}: Readonly<{
  sponsorId: string;
}>) {
  const overview = useSponsorOverview(sponsorId);
  const { t: originalT } = useKafilLanguage();
  const fmt = useNajmFormat();
  const t = (key: string, params?: Record<string, string>) => originalT(key as Parameters<typeof originalT>[0], params);

  if (overview.isError) {
    return (
      <NCard
        error={overview.error}
        empty={false}
        errorText={t("operator.sponsors.overviewError")}
        onRetry={() => void overview.refetch()}
      />
    );
  }

  if (overview.isPending || !overview.data) {
    return <SponsorOverviewSkeleton />;
  }

  const vm = buildOperatorSponsorOverviewViewModel(overview.data, fmt, t);

  return (
    <div className="space-y-4">
      <SponsorKpiGrid desktopColumns={4} kpis={vm.kpis} variant="compact" />

      <SponsorInformationCard sponsor={vm.sponsorInfo} t={t} />

      <NGrid cols={1} lgCols={12}>
        <NGridItem span={1} lgSpan={5}>
          <SupportBudgetCard
            icon={WalletCards}
            segments={vm.budgetSegments}
            total={vm.budgetTotal}
            title={t("dashboard.sponsor.supportBudgetUse")}
            totalLabel={t("dashboard.sponsor.totalBudget")}
            emptyLabel={t("dashboard.sponsor.noSupportedBudget")}
          />
        </NGridItem>
        <NGridItem span={1} lgSpan={7}>
          <ContributionOverviewCard
            data={vm.contributionTrend}
            icon={HandCoins}
            series={vm.chartSeries}
            title={t("dashboard.sponsor.contributionOverview")}
            valueFormatter={vm.contributionValueFormatter}
          />
        </NGridItem>
      </NGrid>

      <NGrid cols={1} lgCols={2}>
        <NGridItem span={1}>
          <RecentContributionsCard
            contributions={vm.recentContributions}
            icon={HandCoins}
            title={t("dashboard.sponsor.recentContributions")}
            emptyLabel={t("dashboard.sponsor.noContributions")}
          />
        </NGridItem>
        <NGridItem span={1}>
          <RecentSupportedOrdersCard
            orders={vm.recentSupportedOrders}
            icon={WalletCards}
            title={t("dashboard.sponsor.recentSupportedOrders")}
            emptyLabel={t("dashboard.sponsor.noSupportedOrders")}
            itemsLabel={t("dashboard.sponsor.items")}
          />
        </NGridItem>
      </NGrid>
    </div>
  );
}
