"use client";

import { HandCoins, WalletCards } from "lucide-react";
import { NErrorState, NGrid, NGridItem, NPageLayout, useNajmFormat } from "najm-kit";
import Link from "next/link";

import { useTranslation } from "najm-i18n/react";
import { getPublicApiErrorMessage } from "@/services/apiError";
import { ContributionOverviewCard } from "@/features/Sponsors/components/overview/ContributionOverviewCard";
import { RecentContributionsCard } from "@/features/Sponsors/components/overview/RecentContributionsCard";
import { RecentSupportedOrdersCard } from "@/features/Sponsors/components/overview/RecentSupportedOrdersCard";
import { SponsorKpiGrid } from "@/features/Sponsors/components/overview/SponsorKpiGrid";
import { SupportBudgetCard } from "@/features/Sponsors/components/overview/SupportBudgetCard";
import { SponsorDashboardSkeleton } from "@/features/Dashboard/shared/DashboardSkeletons";

import { useSponsorDashboard } from "../hooks/useSponsorDashboard";
import { buildSponsorDashboardViewModel } from "../lib/buildSponsorDashboardViewModel";
import { SponsorDashboardHeader } from "./SponsorDashboardHeader";
import { SponsorQuickActionsCard } from "./SponsorQuickActionsCard";
import { SupportedFamiliesCard } from "./SupportedFamiliesCard";
import { UpcomingContributionsCard } from "./UpcomingContributionsCard";

export function SponsorDashboardPage() {
  const dashboard = useSponsorDashboard();
  const { t } = useTranslation();
  const fmt = useNajmFormat();

  if (dashboard.isError) {
    return (
      <NErrorState
        message={getPublicApiErrorMessage(dashboard.error, t("state.retry"))}
        title={t("dashboard.sponsor.error")}
        onRetry={() => void dashboard.refetch()}
        surface="panel"
      />
    );
  }

  if (dashboard.isPending || !dashboard.data) {
    return (
      <SponsorDashboardSkeleton
        loadingLabel={t("state.loading")}
        title={t("dashboard.sponsor.loading")}
      />
    );
  }

  const data = dashboard.data;
  const money = (value: number) => fmt.money(value);
  const tString = (key: string, params?: Record<string, string>) => t(key as Parameters<typeof t>[0], params);
  const vm = buildSponsorDashboardViewModel(data, fmt, tString);

  return (
    <NPageLayout className="flex min-h-full flex-col gap-4 xl:h-full xl:min-h-0">
      <SponsorDashboardHeader
        subtitle={t("dashboard.sponsor.subtitle")}
        title={t("dashboard.sponsor.welcome", { name: vm.displayName })}
      />

      <SponsorKpiGrid desktopColumns={5} kpis={vm.kpis} />

      <NGrid
        cols={1}
        mdCols={2}
        xlCols={12}
        className="flex-1 xl:min-h-0 xl:grid-rows-[auto_minmax(0,1fr)]"
      >
        <NGridItem span={1} xlSpan={3}>
          <SupportedFamiliesCard
            families={vm.supportedFamilies}
            hasMore={vm.hasMoreFamilies}
            t={tString}
          />
        </NGridItem>
        <NGridItem span={1} xlSpan={6}>
          <ContributionOverviewCard
            data={vm.contributionTrend}
            emptyLabel={tString("dashboard.sponsor.noContributions")}
            icon={HandCoins}
            series={[
              { key: "validatedMinor", label: tString("dashboard.common.validated") },
              { key: "pendingMinor", label: tString("dashboard.common.pending") },
            ]}
            title={tString("dashboard.sponsor.contributionTrend")}
            valueFormatter={money}
          />
        </NGridItem>
        <NGridItem span={1} xlSpan={3}>
          <SupportBudgetCard
            compact={false}
            icon={WalletCards}
            segments={vm.budgetSegments}
            total={vm.budgetTotal}
            title={tString("dashboard.sponsor.supportBudgetUse")}
            totalLabel={tString("dashboard.sponsor.totalBudget")}
            emptyLabel={tString("dashboard.sponsor.noSupportedBudget")}
          />
        </NGridItem>
        <NGridItem span={1} xlSpan={3}>
          <RecentContributionsCard
            contributions={vm.recentContributions}
            icon={HandCoins}
            title={tString("dashboard.sponsor.recentContributions")}
            emptyLabel={tString("dashboard.sponsor.noContributions")}
            rowHref="/contribution"
            footer={
              <Link
                className="mt-3 block rounded-lg border border-dashed border-border/70 px-4 py-2.5 text-center text-sm font-medium text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                href="/contribution"
              >
                {tString("dashboard.sponsor.viewAllContributions")}
              </Link>
            }
          />
        </NGridItem>
        <NGridItem span={1} xlSpan={3}>
          <RecentSupportedOrdersCard
            orders={vm.recentSupportedOrders}
            icon={WalletCards}
            title={tString("dashboard.sponsor.recentSupportedOrders")}
            emptyLabel={tString("dashboard.sponsor.noSupportedOrders")}
            itemsLabel={tString("dashboard.sponsor.items")}
            rowHref="/orders"
            footer={
              <Link
                className="mt-3 block rounded-lg border border-dashed border-border/70 px-4 py-2.5 text-center text-sm font-medium text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                href="/orders"
              >
                {tString("dashboard.sponsor.viewAllOrders")}
              </Link>
            }
          />
        </NGridItem>
        <NGridItem span={1} xlSpan={3}>
          <UpcomingContributionsCard
            contributions={vm.upcomingContributions}
            t={tString}
          />
        </NGridItem>
        <NGridItem span={1} xlSpan={3}>
          <SponsorQuickActionsCard t={tString} />
        </NGridItem>
      </NGrid>
    </NPageLayout>
  );
}
