"use client";

import { BadgeCheck, Check, HandCoins, HandHeart, PackageSearch, ShoppingBasket, Truck, UserPlus, } from "lucide-react";
import type { DashboardStatusCount, AttentionCardProps } from "../../types";
import { useTranslation } from "najm-i18n/react";
import { NCard, useNajmFormat } from "najm-kit";
import Link from "next/link";

export function AttentionCard({ orderStatuses, pendingContributions, pendingApplicants, familiesWithoutSponsorship, }: Readonly<AttentionCardProps>) {

  const { t } = useTranslation();
  const fmt = useNajmFormat();

  function getStatusCount(statuses: DashboardStatusCount[], status: string) {
    return statuses.find((item) => item.status === status)?.count ?? 0;
  }

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
      href: "/contribution",
      icon: HandCoins,
      label: t("dashboard.operator.awaitingContributionReview"),
      tone: "bg-emerald-500",
    },
    {
      count: pendingApplicants,
      href: "/applicants",
      icon: UserPlus,
      label: t("dashboard.operator.awaitingApplicantReview"),
      tone: "bg-rose-500",
    },
    {
      count: familiesWithoutSponsorship,
      href: "/operator/families",
      icon: HandHeart,
      label: t("dashboard.operator.awaitingSponsorship"),
      tone: "bg-indigo-500",
    },
  ];

  return (
    <NCard className="h-full" icon={PackageSearch} title={t("dashboard.operator.operationalAttention")}>
      <div className="divide-y divide-border/70">
        {attentionItems.map((item) => {
          const Icon = item.icon;
          const isEmpty = !item.count;
          return (
            <Link
              className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0 hover:text-primary"
              href={item.href}
              key={item.label}
            >
              <span className="flex min-w-0 items-center gap-2.5">
                <span className={`size-2 shrink-0 rounded-full ${item.tone}`} />
                <Icon
                  aria-hidden="true"
                  className={`size-4 shrink-0 ${isEmpty ? "text-muted-foreground/60" : "text-muted-foreground"}`}
                />
                <span className={`truncate text-sm ${isEmpty ? "text-muted-foreground" : ""}`}>
                  {item.label}
                </span>
              </span>
              {isEmpty ? (
                <Check
                  aria-hidden="true"
                  aria-label={t("dashboard.operator.allClear")}
                  className="size-4 shrink-0 text-emerald-500"
                />
              ) : (
                <strong className="shrink-0 text-sm tabular-nums">
                  {fmt.number(item.count)}
                </strong>
              )}
            </Link>
          );
        })}
      </div>
    </NCard>
  );
}


