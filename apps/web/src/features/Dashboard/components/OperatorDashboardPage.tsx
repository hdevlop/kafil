"use client";

import {
  Baby,
  ClipboardCheck,
  HandCoins,
  HeartHandshake,
  LayoutDashboard,
  PackageSearch,
  UsersRound,
  WalletCards,
} from "lucide-react";
import { NCard, NGrid, NGridItem, NPageHeaderActions, NPageLayout, NStatCard } from "najm-kit";
import Link from "next/link";

import { useKafilLanguage } from "@/i18n/KafilLanguageProvider";
import { formatKafilNumber, formatMad, formatStatusLabel } from "@/lib/format";
import { PageErrorState } from "@/shared/PageState";
import PageHeaderGlobalActions from "@/shared/PageHeaderGlobalActions";
import { DashboardPageHeader as NPageHeader } from "@/shared/DashboardShell/DashboardPageHeader";

import { useOperatorDashboard } from "../hooks/useDashboard";
import { DonutBreakdown, MonthlyLineChart, PieBreakdown, StatusBreakdown } from "./DashboardCharts";

export function OperatorDashboardPage() {
  const dashboard = useOperatorDashboard();
  const { language, t } = useKafilLanguage();

  if (dashboard.isError) {
    return <PageErrorState error={dashboard.error} title={t("dashboard.operator.error")} onRetry={() => void dashboard.refetch()} />;
  }

  if (dashboard.isPending || !dashboard.data) {
    return <DashboardLoading loadingLabel={t("state.loading")} title={t("dashboard.operator.title")} />;
  }

  const data = dashboard.data;
  const number = (value: number) => formatKafilNumber(value, language);
  const money = (value: number) => formatMad(value, language);

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
        <NGridItem span={1} xlSpan={2}>
          <PieBreakdown
            data={[
              { label: t("dashboard.operator.families"), value: data.counts.families, color: "#55A7EE" },
              { label: t("dashboard.operator.children"), value: data.counts.children, color: "#9A7BD7" },
              { label: t("dashboard.operator.sponsors"), value: data.counts.sponsors, color: "#F3C74F" },
            ]}
            icon={UsersRound}
            title={t("dashboard.operator.communityBreakdown")}
            valueFormatter={number}
          />
        </NGridItem>
        <NGridItem span={1} xlSpan={8}>
          <MonthlyLineChart
            data={data.contributionTrend}
            icon={HandCoins}
            language={language}
            series={[
              { key: "validatedMinor", label: t("dashboard.common.validated"), color: "var(--primary)" },
              { key: "refundedMinor", label: t("dashboard.common.refunded"), color: "var(--destructive)" },
            ]}
            title={t("dashboard.operator.contributionTrend")}
            valueFormatter={money}
          />
        </NGridItem>
        <NGridItem span={1} xlSpan={2}>
          <DonutBreakdown
            data={[
              { label: t("dashboard.common.available"), value: data.money.availableBudgetMinor, color: "var(--primary)" },
              { label: t("dashboard.common.reserved"), value: data.money.reservedBudgetMinor, color: "var(--secondary)" },
              { label: t("dashboard.common.spent"), value: data.money.spentBudgetMinor, color: "var(--destructive)" },
            ]}
            icon={WalletCards}
            totalLabel={t("family.cart.total")}
            title={t("dashboard.operator.budgetPosition")}
            valueFormatter={money}
          />
        </NGridItem>
      </NGrid>

      <NGrid cols={1} xlCols={12} className="flex-1">
        <NGridItem span={1} xlSpan={6}>
          <StatusBreakdown
            data={data.orderStatuses}
            emptyLabel={t("state.empty")}
            icon={ClipboardCheck}
            labelForStatus={(status) => formatStatusLabel(status, language)}
            language={language}
            title={t("dashboard.operator.orderPipeline")}
          />
        </NGridItem>
        <NGridItem span={1} xlSpan={6}>
          <NCard className="h-full" icon={PackageSearch} title={t("dashboard.operator.stockAttention")}>
            {data.lowStock.length ? (
              <div className="space-y-2">
                {data.lowStock.map((product) => (
                  <Link
                    className="flex items-center justify-between gap-3 rounded-xl border border-border/70 p-3 transition-colors hover:bg-muted/60"
                    href="/operator/inventory"
                    key={product.productId}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">{product.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">{product.sku}</span>
                    </span>
                    <strong className="shrink-0 text-sm text-destructive">
                      {t("dashboard.operator.unitsAvailable", { count: number(product.availableQuantity) })}
                    </strong>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="grid min-h-44 place-items-center text-center">
                <div>
                  <p className="font-semibold">{t("dashboard.operator.stockHealthy")}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{t("dashboard.operator.stockHealthyDescription")}</p>
                </div>
              </div>
            )}
          </NCard>
        </NGridItem>
      </NGrid>
    </NPageLayout>
  );
}

function DashboardLoading({ loadingLabel, title }: Readonly<{ loadingLabel: string; title: string }>) {
  return (
    <NPageLayout className="flex min-h-full flex-col gap-4">
      <NPageHeader icon={LayoutDashboard} title={title} subtitle={loadingLabel} />
      <NGrid cols={1} smCols={2} lgCols={3} xlCols={6}>
        {Array.from({ length: 6 }, (_, index) => <NCard key={index} loading title={loadingLabel} />)}
      </NGrid>
      <NGrid cols={1} lgCols={2}>
        <NCard loading title={loadingLabel} />
        <NCard loading title={loadingLabel} />
      </NGrid>
    </NPageLayout>
  );
}
