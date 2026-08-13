"use client";

import { Baby, ClipboardCheck, HandCoins, HeartHandshake, LayoutDashboard, UsersRound, WalletCards } from "lucide-react";
import { NErrorState, NPageHeader, NDonutCard, NGrid, NGridItem, NLineChart, NPageHeaderActions, NPageLayout, NPieChart, NStatCard, NStatusBreakdown, useNajmFormat } from "najm-kit";
import { toChartData } from "../../shared/chartData";
import { AdminDashboardSkeleton } from "../../shared/DashboardSkeletons";
import { retainOrderPipelineStages } from "../../shared/orderPipeline";
import { formatStatusLabel } from "@/features/StatusLabels";
import PageHeaderGlobalActions from "@/shared/PageHeaderGlobalActions";
import { useKafilLanguage } from "@/i18n/useKafilLanguage";
import { useAdminDashboard } from "../hooks/useAdminDashboard";
import { LatestOrdersCard } from "./LatestOrdersCard";
import { QuickActionsCard } from "./QuickActionsCard";
import { getPublicApiErrorMessage } from "@/services/apiError";
import { AttentionCard } from "./AttentionCard";

export function AdminDashboardPage() {

  const dashboard = useAdminDashboard();
  const { language, t } = useKafilLanguage();
  const fmt = useNajmFormat();

  if (dashboard.isError) {
    return (
      <NErrorState
        message={getPublicApiErrorMessage(dashboard.error, t("state.retry"))}
        title={t("dashboard.operator.error")}
        onRetry={() => void dashboard.refetch()}
        surface="panel"
      />
    );
  }

  if (dashboard.isPending || !dashboard.data) {
    return <AdminDashboardSkeleton loadingLabel={t("state.loading")} title={t("dashboard.operator.title")} />;
  }

  const data = dashboard.data;
  const number = (value: number) => fmt.number(value);
  const money = (value: number) => fmt.money(value);

  return (
    <NPageLayout className="flex min-h-full flex-col gap-4">
      <NPageHeader
        icon={LayoutDashboard}
        title={t("dashboard.operator.title")}
        subtitle={t("dashboard.operator.subtitle")}
      >
        <NPageHeaderActions>
          <PageHeaderGlobalActions />
        </NPageHeaderActions>
      </NPageHeader>

      <NGrid cols={2} lgCols={4} xlCols={6}>
        <NGridItem span={1}>
          <NStatCard variant="compact" icon={UsersRound} label={t("dashboard.operator.families")} value={number(data.counts.families)} className="sm:hidden" />
          <NStatCard icon={UsersRound} label={t("dashboard.operator.families")} value={number(data.counts.families)} className="hidden sm:block" />
        </NGridItem>
        <NGridItem span={1}>
          <NStatCard variant="compact" icon={Baby} label={t("dashboard.operator.children")} value={number(data.counts.children)} className="sm:hidden" />
          <NStatCard icon={Baby} label={t("dashboard.operator.children")} value={number(data.counts.children)} className="hidden sm:block" />
        </NGridItem>
        <NGridItem span={1}>
          <NStatCard variant="compact" icon={HeartHandshake} label={t("dashboard.operator.sponsors")} value={number(data.counts.sponsors)} className="sm:hidden" />
          <NStatCard icon={HeartHandshake} label={t("dashboard.operator.sponsors")} value={number(data.counts.sponsors)} className="hidden sm:block" />
        </NGridItem>
        <NGridItem span={1}>
          <NStatCard variant="compact" icon={HandCoins} label={t("dashboard.operator.pendingContributions")} value={number(data.counts.pendingContributions)} className="sm:hidden" />
          <NStatCard icon={HandCoins} label={t("dashboard.operator.pendingContributions")} value={number(data.counts.pendingContributions)} className="hidden sm:block" />
        </NGridItem>
        <NGridItem span={1}>
          <NStatCard variant="compact" icon={WalletCards} label={t("dashboard.operator.availableBudget")} value={money(data.money.availableBudgetMinor)} className="sm:hidden" />
          <NStatCard icon={WalletCards} label={t("dashboard.operator.availableBudget")} value={money(data.money.availableBudgetMinor)} className="hidden sm:block" />
        </NGridItem>
        <NGridItem span={1}>
          <NStatCard variant="compact" icon={ClipboardCheck} label={t("dashboard.operator.openOrders")} value={number(data.counts.openOrders)} className="sm:hidden" />
          <NStatCard icon={ClipboardCheck} label={t("dashboard.operator.openOrders")} value={number(data.counts.openOrders)} className="hidden sm:block" />
        </NGridItem>
      </NGrid>

      <NGrid cols={1} xlCols={12}>

        <NGridItem span={1} xlSpan={3}>
          <NPieChart
            className="h-full"
            items={[
              { id: "families", label: t("dashboard.operator.families"), value: data.counts.families },
              { id: "children", label: t("dashboard.operator.children"), value: data.counts.children },
              { id: "sponsors", label: t("dashboard.operator.sponsors"), value: data.counts.sponsors },
            ]}
            icon={UsersRound}
            title={t("dashboard.operator.communityBreakdown")}
            valueFormatter={number}
          />
        </NGridItem>

        <NGridItem span={1} xlSpan={6}>
          <NLineChart
            className="h-full"
            data={toChartData(data.contributionTrend, ["validatedMinor", "refundedMinor"], fmt)}
            icon={HandCoins}
            series={[
              { id: "validatedMinor", label: t("dashboard.common.validated") },
              { id: "refundedMinor", label: t("dashboard.common.refunded") },
            ]}
            title={t("dashboard.operator.contributionTrend")}
            valueFormatter={money}
          />
        </NGridItem>

        <NGridItem span={1} xlSpan={3}>
          <NDonutCard
            className="h-full"
            icon={WalletCards}
            items={[
              { id: "available", label: t("dashboard.common.available"), value: data.money.availableBudgetMinor },
              { id: "reserved", label: t("dashboard.common.reserved"), value: data.money.reservedBudgetMinor },
              { id: "spent", label: t("dashboard.common.spent"), value: data.money.spentBudgetMinor },
            ]}
            title={t("dashboard.operator.budgetPosition")}
            totalLabel={t("family.cart.total")}
            valueFormatter={money}
          />
        </NGridItem>
      </NGrid>

      <NGrid cols={1} mdCols={2} xlCols={12} className="flex-1">

        <NGridItem span={1} xlSpan={3}>
          <NStatusBreakdown
            className="h-full"
            emptyLabel={t("state.empty")}
            icon={ClipboardCheck}
            items={retainOrderPipelineStages(data.orderStatuses)
              .filter(({ status }) => status !== "purchased")
              .map(({ status, count }) => ({
                id: status,
                label: formatStatusLabel(status, language),
                value: count,
                ...(status === "approved" ? { className: "hidden xl:block" } : {}),
              }))}
            title={t("dashboard.operator.orderPipeline")}
          />
        </NGridItem>

        <NGridItem span={1} xlSpan={3}>
          <LatestOrdersCard recentOrders={data.recentOrders ?? []} />
        </NGridItem>

        <NGridItem span={1} xlSpan={3}>
          <AttentionCard
            orderStatuses={data.orderStatuses}
            pendingContributions={data.counts.pendingContributions}
            pendingApplicants={data.counts.pendingApplicants}
            familiesWithoutSponsorship={data.counts.familiesWithoutSponsorship}
          />
        </NGridItem>

        <NGridItem span={1} xlSpan={3}>
          <QuickActionsCard />
        </NGridItem>
        
      </NGrid>
    </NPageLayout>
  );
}
