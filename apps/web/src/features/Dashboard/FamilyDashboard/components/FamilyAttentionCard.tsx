"use client";

import { BadgeCheck, PackageSearch, ShoppingBasket, Truck } from "lucide-react";
import { useTranslation } from "najm-i18n/react";

import { DashboardAttentionCard } from "../../shared/DashboardAttentionCard";
import type { DashboardStatusCount } from "../../types";

function getStatusCount(statuses: DashboardStatusCount[], status: string) {
  return statuses.find((item) => item.status === status)?.count ?? 0;
}

export function FamilyAttentionCard({
  orderStatuses,
}: Readonly<{ orderStatuses: DashboardStatusCount[] }>) {
  const { t } = useTranslation();
  const items = [
    {
      value: getStatusCount(orderStatuses, "pending"),
      href: "/orders",
      icon: BadgeCheck,
      id: "awaiting-approval",
      label: t("dashboard.operator.awaitingApproval"),
      tone: "bg-amber-500",
    },
    {
      value: getStatusCount(orderStatuses, "approved"),
      href: "/orders",
      icon: ShoppingBasket,
      id: "awaiting-purchase",
      label: t("dashboard.operator.awaitingPurchase"),
      tone: "bg-sky-500",
    },
    {
      value: getStatusCount(orderStatuses, "purchased"),
      href: "/orders",
      icon: Truck,
      id: "awaiting-delivery",
      label: t("dashboard.operator.awaitingDelivery"),
      tone: "bg-violet-500",
    },
  ];

  return (
    <DashboardAttentionCard
      allClearLabel={t("dashboard.operator.allClear")}
      icon={PackageSearch}
      items={items}
      title={t("dashboard.operator.operationalAttention")}
    />
  );
}
