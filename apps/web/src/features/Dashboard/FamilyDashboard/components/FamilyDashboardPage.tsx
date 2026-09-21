"use client";

import {
  Baby,
  ClipboardCheck,
  House,
  ShoppingBag,
  WalletCards,
} from "lucide-react";
import {
  NBadge,
  NPageHeader,
  NBarChart,
  NCard,
  NDonutCard,
  NEmptyState,
  NErrorState,
  NGrid,
  NGridItem,
  NPageHeaderActions,
  NPageLayout,
  NStatCard,
  NStatusBreakdown,
  useNajmFormat,
} from "najm-kit";
import Link from "next/link";

import { formatStatusLabel } from "@/features/StatusLabels";
import { useTranslation } from "najm-i18n/react";
import { getPublicApiErrorMessage } from "@/services/apiError";
import PageHeaderGlobalActions from "@/shared/PageHeaderGlobalActions";
import { NNextImage } from "najm-kit/next";

import { toChartData } from "../../shared/chartData";
import { FamilyDashboardSkeleton } from "../../shared/DashboardSkeletons";
import { retainOrderPipelineStages } from "../../shared/orderPipeline";
import { useFamilyDashboard, useOwnFamilyChildren, useOwnFamilyProfile } from "../hooks/useFamilyDashboard";
import { FamilyAttentionCard } from "./FamilyAttentionCard";
import { FamilyQuickActionsCard } from "./FamilyQuickActionsCard";
import { MyFamilyCard } from "./MyFamilyCard";

export function FamilyDashboardPage() {
  const dashboard = useFamilyDashboard();
  const children = useOwnFamilyChildren();
  const profile = useOwnFamilyProfile();
  const { language, t } = useTranslation();
  const fmt = useNajmFormat();

  if (dashboard.isError) {
    return (
      <NErrorState
        message={getPublicApiErrorMessage(dashboard.error, t("state.retry"))}
        title={t("dashboard.family.error")}
        onRetry={() => void dashboard.refetch()}
        surface="panel"
      />
    );
  }
  if (dashboard.isPending || !dashboard.data) {
    return <FamilyDashboardSkeleton loadingLabel={t("dashboard.family.loading")} />;
  }

  const data = dashboard.data;
  const number = (value: number) => fmt.number(value);
  const money = (value: number) => fmt.money(value);
  const monthlyLimit = typeof data.budget.limitMinor === "number"
    ? data.budget.limitMinor
    : null;
  const monthlyRemaining = typeof data.budget.remainingMinor === "number"
    ? data.budget.remainingMinor
    : null;
  const monthlyUsed = typeof data.budget.usedMinor === "number"
    ? data.budget.usedMinor
    : 0;
  const unavailableMonthlyAmount = "—";

  return (
    <NPageLayout className="flex min-h-full flex-col gap-4">
      <NPageHeader
        icon={House}
        title={t("dashboard.family.welcome", { name: data.displayName })}
        subtitle={t("dashboard.family.subtitle")}
      >
        <NPageHeaderActions>
          <PageHeaderGlobalActions />
        </NPageHeaderActions>
      </NPageHeader>

      <NGrid cols={2} lgCols={3} xlCols={6}>
        <NGridItem span={1}>
          <NStatCard variant="compact" icon={WalletCards} label={t("dashboard.family.monthlyRemaining")} value={monthlyRemaining === null ? unavailableMonthlyAmount : money(monthlyRemaining)} className="sm:hidden" />
          <NStatCard icon={WalletCards} label={t("dashboard.family.monthlyRemaining")} value={monthlyRemaining === null ? unavailableMonthlyAmount : money(monthlyRemaining)} className="hidden sm:block" />
        </NGridItem>
        <NGridItem span={1}>
          <NStatCard variant="compact" icon={WalletCards} label={t("dashboard.family.monthlyLimit")} value={monthlyLimit === null ? unavailableMonthlyAmount : money(monthlyLimit)} className="sm:hidden" />
          <NStatCard icon={WalletCards} label={t("dashboard.family.monthlyLimit")} value={monthlyLimit === null ? unavailableMonthlyAmount : money(monthlyLimit)} className="hidden sm:block" />
        </NGridItem>
        <NGridItem span={1}>
          <NStatCard variant="compact" icon={ShoppingBag} label={t("dashboard.family.monthlyUsed")} value={money(monthlyUsed)} className="sm:hidden" />
          <NStatCard icon={ShoppingBag} label={t("dashboard.family.monthlyUsed")} value={money(monthlyUsed)} className="hidden sm:block" />
        </NGridItem>
        <NGridItem span={1}>
          <NStatCard variant="compact" icon={Baby} label={t("dashboard.family.children")} value={number(data.counts.children)} className="sm:hidden" />
          <NStatCard icon={Baby} label={t("dashboard.family.children")} value={number(data.counts.children)} className="hidden sm:block" />
        </NGridItem>
        <NGridItem span={1}>
          <NStatCard variant="compact" icon={ClipboardCheck} label={t("dashboard.family.openOrders")} value={number(data.counts.openOrders)} className="sm:hidden" />
          <NStatCard icon={ClipboardCheck} label={t("dashboard.family.openOrders")} value={number(data.counts.openOrders)} className="hidden sm:block" />
        </NGridItem>
        <NGridItem span={1}>
          <NStatCard variant="compact" icon={ClipboardCheck} label={t("dashboard.family.deliveredOrders")} value={number(data.counts.deliveredOrders)} className="sm:hidden" />
          <NStatCard icon={ClipboardCheck} label={t("dashboard.family.deliveredOrders")} value={number(data.counts.deliveredOrders)} className="hidden sm:block" />
        </NGridItem>
      </NGrid>

      <NGrid cols={1} xlCols={12}>
        <NGridItem span={1} xlSpan={3}>
          {profile.data && children.data ? (
            <MyFamilyCard profile={profile.data} familyChildren={children.data} />
          ) : null}
        </NGridItem>
        <NGridItem span={1} xlSpan={6}>
          <NBarChart
            className="h-full"
            data={toChartData(data.orderTrend, ["spentMinor"], fmt)}
            icon={ShoppingBag}
            series={[{ id: "spentMinor", label: t("dashboard.family.orderValue") }]}
            title={t("dashboard.family.spendingTrend")}
            valueFormatter={money}
            emptyLabel={<NEmptyState icon={ShoppingBag} title={t("state.empty")} />}
          />
        </NGridItem>
        <NGridItem span={1} xlSpan={3}>
          {monthlyLimit !== null && monthlyRemaining !== null ? (
            <NDonutCard
              className="h-full"
              icon={WalletCards}
              items={[
                { id: "remaining", label: t("dashboard.family.monthlyRemaining"), value: monthlyRemaining },
                { id: "used", label: t("dashboard.family.monthlyUsed"), value: monthlyUsed },
              ]}
              title={t("dashboard.family.monthlyBudget")}
              totalLabel={t("dashboard.family.monthlyLimit")}
              valueFormatter={money}
            />
          ) : (
            <NCard
              className="h-full"
              icon={WalletCards}
              title={t("dashboard.family.monthlyBudget")}
            >
              <NEmptyState
                className="min-h-40 py-8"
                icon={WalletCards}
                description={t("dashboard.family.monthlyUsedAmount", { amount: money(monthlyUsed) })}
                title={t("dashboard.family.noMonthlyBudget")}
              />
            </NCard>
          )}
        </NGridItem>
      </NGrid>

      <NGrid cols={1} lgCols={2} xlCols={4} className="flex-1">
        <NGridItem span={1}>
          <NStatusBreakdown
            className="h-full"
            emptyLabel={<NEmptyState icon={ClipboardCheck} title={t("state.empty")} />}
            icon={ClipboardCheck}
            items={retainOrderPipelineStages(data.orderStatuses)
              .map(({ status, count }) => ({
                id: status,
                label: formatStatusLabel(status, language),
                value: count,
              }))}
            title={t("dashboard.family.orderPipeline")}
          />
        </NGridItem>
        <NGridItem className="h-full" span={1}>
          <FamilyAttentionCard orderStatuses={data.orderStatuses} />
        </NGridItem>
        <NGridItem className="h-full" span={1}>
          <FamilyQuickActionsCard />
        </NGridItem>
        <NGridItem className="h-full" span={1}>
          <NCard className="h-full" icon={ClipboardCheck} title={t("dashboard.family.recentOrders")}>
            <div className="space-y-2">
              {data.recentOrders.length ? data.recentOrders.map((order) => (
                <Link className="flex items-center justify-between gap-3 rounded-xl border border-border/70 p-3 hover:bg-muted/60" href="/orders" key={order.id}>
                  <span className="relative grid size-12 shrink-0 place-items-center overflow-hidden rounded-lg bg-muted text-muted-foreground">
                    {order.dominantCategoryImage ? (
                      <NNextImage unoptimized
                        alt={order.dominantCategoryName ?? t("dashboard.family.orderCategoryAlt")}
                        className="object-cover"
                        fill
                        sizes="48px"
                        src={order.dominantCategoryImage}
                      />
                    ) : (
                      <ShoppingBag aria-hidden="true" className="size-5" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{order.orderNumber}</span>
                    <span className="block text-xs text-muted-foreground">{fmt.date(order.placedAt)}</span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-1">
                    <strong className="text-sm">{money(order.totalMinor)}</strong>
                    <NBadge status={order.status} />
                  </span>
                </Link>
              )) : (
                <NEmptyState
                  className="min-h-40 py-8"
                  icon={ShoppingBag}
                  title={t("dashboard.family.noOrders")}
                />
              )}
            </div>
          </NCard>
        </NGridItem>
      </NGrid>
    </NPageLayout>
  );
}
