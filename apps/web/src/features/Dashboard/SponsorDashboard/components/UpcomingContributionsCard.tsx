"use client";

import { Calendar } from "lucide-react";
import { NCard } from "najm-kit";
import Link from "next/link";

import { formatKafilDate, formatMad, type KafilLanguage } from "@/lib/format";

import type { UpcomingContributionEntry } from "../types";

export function UpcomingContributionsCard({
  contributions,
  language,
  t,
}: Readonly<{
  contributions: UpcomingContributionEntry[];
  language: KafilLanguage;
  t: (key: string) => string;
}>) {
  const money = (value: number) => formatMad(value, language);

  return (
    <NCard
      className="h-full"
      icon={Calendar}
      title={t("dashboard.sponsor.upcomingContributions")}
    >
      {contributions.length > 0 ? (
        <>
          <div className="space-y-3">
            {contributions.map((plan) => (
              <Link
                className="flex items-start gap-3 rounded-xl border border-border/70 p-3 hover:bg-muted/60"
                href="/sponsor/contributions"
                key={plan.planId}
              >
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Calendar className="size-4 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold tabular-nums">
                    {formatKafilDate(plan.dueAt, language)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {money(plan.amountMinor)} · {plan.supportReference}
                  </p>
                </div>
              </Link>
            ))}
          </div>
          <Link
            className="mt-3 block rounded-lg border border-dashed border-border/70 px-4 py-2.5 text-center text-sm font-medium text-muted-foreground hover:bg-muted/60 hover:text-foreground"
            href="/sponsor/contributions"
          >
            {t("dashboard.sponsor.viewAllPlans")}
          </Link>
        </>
      ) : (
        <p className="py-10 text-center text-sm text-muted-foreground">
          {t("dashboard.sponsor.noUpcomingContributions")}
        </p>
      )}
    </NCard>
  );
}
