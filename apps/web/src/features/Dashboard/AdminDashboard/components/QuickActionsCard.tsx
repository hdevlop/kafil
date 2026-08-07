"use client";

import { ArrowRight, BadgeCheck, HandCoins, ShoppingBasket, Truck, UserCheck, Zap, } from "lucide-react";
import { useKafilLanguage } from "@/i18n/useKafilLanguage";
import { NButton, NCard } from "najm-kit";
import Link from "next/link";

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
      href: "/contribution",
      icon: HandCoins,
      label: t("dashboard.operator.reviewContributions"),
    },
    {
      description: t("dashboard.operator.reviewApplicantsHint"),
      href: "/applicants",
      icon: UserCheck,
      label: t("dashboard.operator.reviewApplicants"),
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
          <NButton asChild className="h-auto min-h-14 w-full justify-start px-3 py-2 text-start " key={action.label} variant="outline" >
            <Link href={action.href} >

              <div className="flex items-center p-2 justify-center rounded-xl bg-primary/10 ">
                <action.icon aria-hidden="true" className="size-5 shrink-0 text-primary " />
              </div>

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
