"use client";

import { Baby, ClipboardCheck, House, ShoppingBag, WalletCards } from "lucide-react";
import { NCard, NGrid, NGridItem, NPageHeaderActions, NPageLayout, NStatCard } from "najm-kit";
import Link from "next/link";

import { FamilyHouseholdCard } from "@/features/FamilyDashboard/components/FamilyHouseholdCard";
import { useOwnFamilyProfile } from "@/features/FamilyDashboard/hooks/useFamilyDashboard";
import { useKafilLanguage } from "@/i18n/KafilLanguageProvider";
import { formatKafilDate, formatKafilNumber, formatMad, formatStatusLabel } from "@/lib/format";
import { PageErrorState } from "@/shared/PageState";
import PageHeaderGlobalActions from "@/shared/PageHeaderGlobalActions";
import { DashboardPageHeader as NPageHeader } from "@/shared/DashboardShell/DashboardPageHeader";
import { StatusBadge } from "@/shared/StatusBadge";

import { useFamilyOverviewDashboard } from "../hooks/useDashboard";
import { DonutBreakdown, MonthlyBarChart, StatusBreakdown } from "./DashboardCharts";

export function FamilyDashboardPage() {
  const dashboard = useFamilyOverviewDashboard();
  const profile = useOwnFamilyProfile();
  const { language, t } = useKafilLanguage();

  if (dashboard.isError) {
    return <PageErrorState error={dashboard.error} title={t("dashboard.family.error")} onRetry={() => void dashboard.refetch()} />;
  }
  if (dashboard.isPending || !dashboard.data) {
    return <NCard loading title={t("dashboard.family.loading")} />;
  }

  const data = dashboard.data;
  const number = (value: number) => formatKafilNumber(value, language);
  const money = (value: number) => formatMad(value, language);

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
          <NStatCard variant="compact" icon={WalletCards} label={t("dashboard.common.available")} value={money(data.budget.availableMinor)} className="sm:hidden" />
          <NStatCard icon={WalletCards} label={t("dashboard.common.available")} value={money(data.budget.availableMinor)} className="hidden sm:block" />
        </NGridItem>
        <NGridItem span={1}>
          <NStatCard variant="compact" icon={WalletCards} label={t("dashboard.common.reserved")} value={money(data.budget.reservedMinor)} className="sm:hidden" />
          <NStatCard icon={WalletCards} label={t("dashboard.common.reserved")} value={money(data.budget.reservedMinor)} className="hidden sm:block" />
        </NGridItem>
        <NGridItem span={1}>
          <NStatCard variant="compact" icon={ShoppingBag} label={t("dashboard.common.spent")} value={money(data.budget.spentMinor)} className="sm:hidden" />
          <NStatCard icon={ShoppingBag} label={t("dashboard.common.spent")} value={money(data.budget.spentMinor)} className="hidden sm:block" />
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
        <NGridItem span={1} xlSpan={8}>
          <MonthlyBarChart
            data={data.orderTrend}
            icon={ShoppingBag}
            language={language}
            series={[{ key: "spentMinor", label: t("dashboard.family.orderValue"), color: "var(--primary)" }]}
            title={t("dashboard.family.spendingTrend")}
            valueFormatter={money}
          />
        </NGridItem>
        <NGridItem span={1} xlSpan={4}>
          <DonutBreakdown
            data={[
              { label: t("dashboard.common.available"), value: data.budget.availableMinor, color: "var(--primary)" },
              { label: t("dashboard.common.reserved"), value: data.budget.reservedMinor, color: "var(--secondary)" },
              { label: t("dashboard.common.spent"), value: data.budget.spentMinor, color: "var(--destructive)" },
            ]}
            icon={WalletCards}
            totalLabel={t("family.cart.total")}
            title={t("dashboard.family.budgetPosition")}
            valueFormatter={money}
          />
        </NGridItem>
      </NGrid>

      <NGrid cols={1} lgCols={2} className="flex-1">
        <NGridItem span={1}>
          <StatusBreakdown
            data={data.orderStatuses}
            emptyLabel={t("state.empty")}
            icon={ClipboardCheck}
            labelForStatus={(status) => formatStatusLabel(status, language)}
            language={language}
            title={t("dashboard.family.orderPipeline")}
          />
        </NGridItem>
        <NGridItem span={1}>
          <NCard icon={ClipboardCheck} title={t("dashboard.family.recentOrders")}>
            <div className="space-y-2">
              {data.recentOrders.length ? data.recentOrders.map((order) => (
                <Link className="flex items-center justify-between gap-3 rounded-xl border border-border/70 p-3 hover:bg-muted/60" href="/family/orders" key={order.id}>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{order.orderNumber}</span>
                    <span className="block text-xs text-muted-foreground">{formatKafilDate(order.placedAt, language)}</span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-1">
                    <strong className="text-sm">{money(order.totalMinor)}</strong>
                    <StatusBadge status={order.status} />
                  </span>
                </Link>
              )) : <p className="py-10 text-center text-sm text-muted-foreground">{t("dashboard.family.noOrders")}</p>}
            </div>
          </NCard>
        </NGridItem>
      </NGrid>

      {profile.data ? <FamilyHouseholdCard profile={profile.data} /> : null}
    </NPageLayout>
  );
}
