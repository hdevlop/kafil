"use client";

import { BadgeCheck, HandCoins, ShoppingBasket, Truck, UserCheck } from "lucide-react";
import { useTranslation } from "najm-i18n/react";
import { DashboardQuickActionsCard } from "../../shared/DashboardQuickActionsCard";

export function QuickActionsCard() {

  const { t } = useTranslation();

  const actions = [
    {
      description: t("dashboard.operator.reviewOrdersHint"),
      href: "/orders",
      icon: BadgeCheck,
      id: "review-orders",
      label: t("dashboard.operator.reviewOrders"),
    },
    {
      description: t("dashboard.operator.assignDeliveryHint"),
      href: "/orders",
      icon: Truck,
      id: "assign-delivery",
      label: t("dashboard.operator.assignDelivery"),
    },
    {
      description: t("dashboard.operator.reviewContributionsHint"),
      href: "/contribution",
      icon: HandCoins,
      id: "review-contributions",
      label: t("dashboard.operator.reviewContributions"),
    },
    {
      description: t("dashboard.operator.reviewApplicantsHint"),
      href: "/applicants",
      icon: UserCheck,
      id: "review-applicants",
      label: t("dashboard.operator.reviewApplicants"),
    },
    {
      description: t("dashboard.operator.manageCatalogHint"),
      href: "/products",
      icon: ShoppingBasket,
      id: "manage-catalog",
      label: t("dashboard.operator.manageCatalog"),
    },
  ];

  return <DashboardQuickActionsCard actions={actions} title={t("dashboard.operator.quickActions")} />;
}
