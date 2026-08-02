"use client";

import { HandCoins, WalletCards } from "lucide-react";
import { NGrid, NGridItem, NPageLayout } from "najm-kit";
import Link from "next/link";

import { useKafilLanguage } from "@/i18n/KafilLanguageProvider";
import { formatMad } from "@/lib/format";
import { PageErrorState } from "@/shared/PageState";
import { ContributionOverviewCard } from "@/features/SponsorOverview/components/ContributionOverviewCard";
import { RecentContributionsCard } from "@/features/SponsorOverview/components/RecentContributionsCard";
import { RecentSupportedOrdersCard } from "@/features/SponsorOverview/components/RecentSupportedOrdersCard";
import { SponsorKpiGrid } from "@/features/SponsorOverview/components/SponsorKpiGrid";
import { SupportBudgetCard } from "@/features/SponsorOverview/components/SupportBudgetCard";

import { useSponsorDashboard } from "../hooks/useSponsorDashboard";
import { buildSponsorDashboardViewModel } from "../lib/buildSponsorDashboardViewModel";
import { SponsorDashboardHeader } from "./SponsorDashboardHeader";
import { SponsorDashboardSkeleton } from "./SponsorDashboardSkeleton";
import { SupportedFamiliesCard } from "./SupportedFamiliesCard";
import { UpcomingContributionsCard } from "./UpcomingContributionsCard";

export function SponsorDashboardPage() {
  const dashboard = useSponsorDashboard();
  const { language, t } = useKafilLanguage();

  if (dashboard.isError) {
    return (
      <PageErrorState
        error={dashboard.error}
        title={t("dashboard.sponsor.error")}
        onRetry={() => void dashboard.refetch()}
      />
    );
  }

  if (dashboard.isPending || !dashboard.data) {
    return <SponsorDashboardSkeleton />;
  }

  const data = dashboard.data;
  const money = (value: number) => formatMad(value, language);
  const tString = (key: string, params?: Record<string, string>) => t(key as Parameters<typeof t>[0], params);
  const vm = buildSponsorDashboardViewModel(data, language, tString);

  return (
    <NPageLayout className="flex min-h-full flex-col gap-4">
      <SponsorDashboardHeader
        subtitle={t("dashboard.sponsor.subtitle")}
        title={t("dashboard.sponsor.welcome", { name: vm.displayName })}
      />

      <SponsorKpiGrid desktopColumns={5} kpis={vm.kpis} />

      <NGrid cols={1} xlCols={12}>
        <NGridItem span={1} xlSpan={5}>
          <SupportedFamiliesCard
            families={vm.supportedFamilies}
            hasMore={vm.hasMoreFamilies}
            language={language}
            t={tString}
          />
        </NGridItem>
        <NGridItem span={1} xlSpan={3}>
          <SupportBudgetCard
            icon={WalletCards}
            segments={vm.budgetSegments}
            total={vm.budgetTotal}
            title={tString("dashboard.sponsor.supportBudgetUse")}
            totalLabel={tString("dashboard.sponsor.totalBudget")}
            emptyLabel={tString("dashboard.sponsor.noSupportedBudget")}
            language={language}
          />
        </NGridItem>
        <NGridItem span={1} xlSpan={4}>
          <ContributionOverviewCard
            data={vm.contributionTrend}
            icon={HandCoins}
            language={language}
            series={[
              { key: "validatedMinor", label: tString("dashboard.common.validated"), color: "var(--primary)" },
              { key: "pendingMinor", label: tString("dashboard.common.pending"), color: "var(--secondary)" },
            ]}
            title={tString("dashboard.sponsor.contributionTrend")}
            valueFormatter={money}
          />
        </NGridItem>
      </NGrid>

      <NGrid cols={1} xlCols={12}>
        <NGridItem span={1} xlSpan={5}>
          <RecentContributionsCard
            contributions={vm.recentContributions}
            icon={HandCoins}
            title={tString("dashboard.sponsor.recentContributions")}
            emptyLabel={tString("dashboard.sponsor.noContributions")}
            language={language}
            rowHref="/sponsor/contributions"
            footer={
              <Link
                className="mt-3 block rounded-lg border border-dashed border-border/70 px-4 py-2.5 text-center text-sm font-medium text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                href="/sponsor/contributions"
              >
                {tString("dashboard.sponsor.viewAllContributions")}
              </Link>
            }
          />
        </NGridItem>
        <NGridItem span={1} xlSpan={4}>
          <RecentSupportedOrdersCard
            orders={vm.recentSupportedOrders}
            icon={WalletCards}
            title={tString("dashboard.sponsor.recentSupportedOrders")}
            emptyLabel={tString("dashboard.sponsor.noSupportedOrders")}
            language={language}
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
            language={language}
            t={tString}
          />
        </NGridItem>
      </NGrid>
    </NPageLayout>
  );
}
