"use client";

import {
  ArrowRight,
  ClipboardCheck,
  HandCoins,
  HeartHandshake,
  UserRound,
  Zap,
} from "lucide-react";
import { NButton, NCard } from "najm-kit";
import Link from "next/link";

import { openSponsorProfileSheet } from "@/features/Sponsors/components/profile/SponsorProfileSheet";

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
      label: t("dashboard.sponsor.findFamilyToSupport"),
    },
    {
      description: t("dashboard.sponsor.contributeHint"),
      href: "/contribution",
      icon: HandCoins,
      label: t("dashboard.sponsor.contribute"),
    },
    {
      description: t("dashboard.sponsor.ordersHint"),
      href: "/orders",
      icon: ClipboardCheck,
      label: t("dashboard.sponsor.viewAllOrders"),
    },
  ];

  return (
    <NCard className="h-full" icon={Zap} title={t("dashboard.sponsor.quickActions")}>
      <div className="space-y-2">
        {actions.map((action) => (
          <NButton
            asChild
            className="h-auto min-h-14 w-full justify-start px-3 py-2 text-start"
            key={action.href}
            variant="outline"
          >
            <Link href={action.href}>
              <action.icon aria-hidden="true" className="size-4 shrink-0 text-primary" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{action.label}</span>
                <span className="block truncate text-xs font-normal text-muted-foreground">
                  {action.description}
                </span>
              </span>
              <ArrowRight aria-hidden="true" className="size-4 shrink-0 rtl:rotate-180" />
            </Link>
          </NButton>
        ))}
        <NButton
          className="h-auto min-h-14 w-full justify-start px-3 py-2 text-start"
          variant="outline"
          onClick={openSponsorProfileSheet}
        >
          <UserRound aria-hidden="true" className="size-4 shrink-0 text-primary" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold">
              {t("dashboard.sponsor.manageProfile")}
            </span>
            <span className="block truncate text-xs font-normal text-muted-foreground">
              {t("dashboard.sponsor.profileHint")}
            </span>
          </span>
          <ArrowRight aria-hidden="true" className="size-4 shrink-0 rtl:rotate-180" />
        </NButton>
      </div>
    </NCard>
  );
}
