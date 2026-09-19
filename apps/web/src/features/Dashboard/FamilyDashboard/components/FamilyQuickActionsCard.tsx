"use client";

import { Baby, Bell, ClipboardCheck, ShoppingBag } from "lucide-react";
import { useTranslation } from "najm-i18n/react";

import { DashboardQuickActionsCard } from "../../shared/DashboardQuickActionsCard";

export function FamilyQuickActionsCard() {
  const { t } = useTranslation();
  const actions = [
    {
      description: t("common.categoriesForHousehold"),
      href: "/products",
      icon: ShoppingBag,
      id: "browse-products",
      label: t("nav.products"),
    },
    {
      description: t("dashboard.family.orderPipeline"),
      href: "/orders",
      icon: ClipboardCheck,
      id: "view-orders",
      label: t("nav.orders"),
    },
    {
      description: t("dashboard.family.householdDescription"),
      href: "/children",
      icon: Baby,
      id: "view-children",
      label: t("nav.children"),
    },
    {
      description: t("notifications.inboxSubtitle"),
      href: "/notifications",
      icon: Bell,
      id: "view-notifications",
      label: t("nav.notifications"),
    },
  ];

  return (
    <DashboardQuickActionsCard
      actions={actions}
      title={t("dashboard.operator.quickActions")}
    />
  );
}
