"use client";

import {
  ClipboardCheck,
  HandCoins,
  HeartHandshake,
  UserRound,
} from "lucide-react";

import { openSponsorProfileSheet } from "@/features/Sponsors/components/profile/SponsorProfileSheet";
import { DashboardQuickActionsCard } from "@/features/Dashboard/shared/DashboardQuickActionsCard";

export function SponsorQuickActionsCard({
  t,
}: Readonly<{
  t: (key: string) => string;
}>) {
  const actions = [
    {
      description: t("dashboard.sponsor.findSupportHint"),
      href: "/family",
      icon: HeartHandshake,
      id: "find-family",
      label: t("dashboard.sponsor.findFamilyToSupport"),
    },
    {
      description: t("dashboard.sponsor.contributeHint"),
      href: "/contribution",
      icon: HandCoins,
      id: "contribute",
      label: t("dashboard.sponsor.contribute"),
    },
    {
      description: t("dashboard.sponsor.ordersHint"),
      href: "/orders",
      icon: ClipboardCheck,
      id: "view-orders",
      label: t("dashboard.sponsor.viewAllOrders"),
    },
    {
      description: t("dashboard.sponsor.profileHint"),
      icon: UserRound,
      id: "manage-profile",
      label: t("dashboard.sponsor.manageProfile"),
      onClick: openSponsorProfileSheet,
    },
  ];

  return <DashboardQuickActionsCard actions={actions} title={t("dashboard.sponsor.quickActions")} />;
}
