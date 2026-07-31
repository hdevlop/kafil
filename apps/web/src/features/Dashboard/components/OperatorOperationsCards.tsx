"use client";

import {
  ArrowRight,
  BadgeCheck,
  ClipboardList,
  HandCoins,
  PackageCheck,
  PackageSearch,
  ShoppingBasket,
  Truck,
  Zap,
} from "lucide-react";
import { NButton, NCard, NCardAction } from "najm-kit";
import Link from "next/link";

import { useKafilLanguage } from "@/i18n/KafilLanguageProvider";
import { formatKafilDate, formatKafilNumber, formatMad } from "@/lib/format";
import { StatusBadge } from "@/shared/StatusBadge";

import type { DashboardStatusCount, OperatorDashboardData } from "../types";

interface OperatorOperationsCardsProps {
  pendingContributions: number;
  recentOrders: OperatorDashboardData["recentOrders"];
  orderStatuses: DashboardStatusCount[];
}

export function LatestOrdersCard({
  recentOrders,
}: Readonly<Pick<OperatorOperationsCardsProps, "recentOrders">>) {
  const { language, t } = useKafilLanguage();

  return (
    <NCard className="h-full" icon={ClipboardList} title={t("dashboard.operator.latestOrders")}>
      <NCardAction>
        <NButton asChild size="2xs" variant="ghost">
          <Link href="/orders">
            {t("dashboard.operator.viewAll")}
            <ArrowRight aria-hidden="true" className="size-3.5 rtl:rotate-180" />
          </Link>
        </NButton>
      </NCardAction>

      {recentOrders.length ? (
        <div className="divide-y divide-border/70">
          {recentOrders.map((order) => (
            <Link
              className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 py-2.5 first:pt-0 last:pb-0 hover:text-primary"
              href="/orders"
              key={order.id}
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold">{order.orderNumber}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {order.familyName} · {formatKafilDate(order.placedAt, language)}
                </span>
              </span>
              <span className="flex min-w-0 flex-col items-end gap-1">
                <span className="text-xs font-semibold tabular-nums">{formatMad(order.totalMinor, language)}</span>
                <StatusBadge size="sm" status={order.status} />
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <p className="py-10 text-center text-sm text-muted-foreground">
          {t("dashboard.operator.noRecentOrders")}
        </p>
      )}
    </NCard>
  );
}

export function OperationalAttentionCard({
  orderStatuses,
  pendingContributions,
}: Readonly<Omit<OperatorOperationsCardsProps, "recentOrders">>) {
  const { language, t } = useKafilLanguage();
  const attentionItems = [
    {
      count: getStatusCount(orderStatuses, "pending"),
      href: "/orders",
      icon: BadgeCheck,
      label: t("dashboard.operator.awaitingApproval"),
      tone: "bg-amber-500",
    },
    {
      count: getStatusCount(orderStatuses, "approved"),
      href: "/orders",
      icon: ShoppingBasket,
      label: t("dashboard.operator.awaitingPurchase"),
      tone: "bg-sky-500",
    },
    {
      count: getStatusCount(orderStatuses, "purchased"),
      href: "/orders",
      icon: Truck,
      label: t("dashboard.operator.awaitingDelivery"),
      tone: "bg-violet-500",
    },
    {
      count: pendingContributions,
      href: "/operator/contributions",
      icon: HandCoins,
      label: t("dashboard.operator.awaitingContributionReview"),
      tone: "bg-emerald-500",
    },
  ].filter((item) => item.count > 0);

  return (
    <NCard className="h-full" icon={PackageSearch} title={t("dashboard.operator.operationalAttention")}>
      {attentionItems.length ? (
        <div className="divide-y divide-border/70">
          {attentionItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0 hover:text-primary"
                href={item.href}
                key={item.label}
              >
                <span className="flex min-w-0 items-center gap-2.5">
                  <span className={`size-2 shrink-0 rounded-full ${item.tone}`} />
                  <Icon aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
                  <span className="truncate text-sm">{item.label}</span>
                </span>
                <strong className="shrink-0 text-sm tabular-nums">
                  {formatKafilNumber(item.count, language)}
                </strong>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="flex min-h-40 flex-col items-center justify-center gap-2 text-center">
          <PackageCheck aria-hidden="true" className="size-8 text-primary" />
          <p className="text-sm font-medium">{t("dashboard.operator.noOperationalAttention")}</p>
        </div>
      )}
    </NCard>
  );
}

export function QuickActionsCard() {
  const { t } = useKafilLanguage();
  const actions = [
    {
      description: t("dashboard.operator.reviewOrdersHint"),
      href: "/orders",
      icon: BadgeCheck,
      label: t("dashboard.operator.reviewOrders"),
    },
    {
      description: t("dashboard.operator.assignDeliveryHint"),
      href: "/orders",
      icon: Truck,
      label: t("dashboard.operator.assignDelivery"),
    },
    {
      description: t("dashboard.operator.reviewContributionsHint"),
      href: "/operator/contributions",
      icon: HandCoins,
      label: t("dashboard.operator.reviewContributions"),
    },
    {
      description: t("dashboard.operator.manageCatalogHint"),
      href: "/products",
      icon: ShoppingBasket,
      label: t("dashboard.operator.manageCatalog"),
    },
  ];

  return (
    <NCard className="h-full" icon={Zap} title={t("dashboard.operator.quickActions")}>
      <div className="space-y-2">
        {actions.map((action) => (
          <NButton
            asChild
            className="h-auto min-h-14 w-full justify-start px-3 py-2 text-start"
            key={action.label}
            variant="outline"
          >
            <Link href={action.href}>
              <action.icon aria-hidden="true" className="size-4 shrink-0 text-primary" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{action.label}</span>
                <span className="block truncate text-xs font-normal text-muted-foreground">{action.description}</span>
              </span>
              <ArrowRight aria-hidden="true" className="size-4 shrink-0 rtl:rotate-180" />
            </Link>
          </NButton>
        ))}
      </div>
    </NCard>
  );
}

function getStatusCount(statuses: DashboardStatusCount[], status: string) {
  return statuses.find((item) => item.status === status)?.count ?? 0;
}
