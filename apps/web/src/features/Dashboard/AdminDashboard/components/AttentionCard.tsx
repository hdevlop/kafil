"use client";

import { BadgeCheck, HandCoins, HandHeart, PackageSearch, ShoppingBasket, Truck, UserPlus } from "lucide-react";
import type { DashboardStatusCount, AttentionCardProps } from "../../types";
import { useTranslation } from "najm-i18n/react";
import { DashboardAttentionCard } from "../../shared/DashboardAttentionCard";

export function AttentionCard({ orderStatuses, pendingContributions, pendingApplicants, familiesWithoutSponsorship, }: Readonly<AttentionCardProps>) {

  const { t } = useTranslation();
  function getStatusCount(statuses: DashboardStatusCount[], status: string) {
    return statuses.find((item) => item.status === status)?.count ?? 0;
  }

  const attentionItems = [
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
    {
      value: pendingContributions,
      href: "/contribution",
      icon: HandCoins,
      id: "awaiting-contribution-review",
      label: t("dashboard.operator.awaitingContributionReview"),
      tone: "bg-emerald-500",
    },
    {
      value: pendingApplicants,
      href: "/applicants",
      icon: UserPlus,
      id: "awaiting-applicant-review",
      label: t("dashboard.operator.awaitingApplicantReview"),
      tone: "bg-rose-500",
    },
    {
      value: familiesWithoutSponsorship,
      href: "/operator/families",
      icon: HandHeart,
      id: "awaiting-sponsorship",
      label: t("dashboard.operator.awaitingSponsorship"),
      tone: "bg-indigo-500",
    },
  ];

  return (
    <DashboardAttentionCard
      allClearLabel={t("dashboard.operator.allClear")}
      icon={PackageSearch}
      items={attentionItems}
      title={t("dashboard.operator.operationalAttention")}
    />
  );
}

