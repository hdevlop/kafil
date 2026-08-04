"use client";

import type { LucideIcon } from "lucide-react";
import { NCard } from "najm-kit";
import Link from "next/link";
import type { ReactNode } from "react";

import { formatKafilDate, formatMad, type KafilLanguage } from "@/lib/format";
import { StatusBadge } from "@/shared/StatusBadge";

import type { ContributionEntry } from "../../types";

export function RecentContributionsCard({
  contributions,
  icon,
  title,
  emptyLabel,
  language,
  footer,
  rowHref,
}: Readonly<{
  contributions: ContributionEntry[];
  icon: LucideIcon;
  title: string;
  emptyLabel: string;
  language: KafilLanguage;
  footer?: ReactNode;
  rowHref?: string;
}>) {
  const money = (value: number) => formatMad(value, language);

  return (
    <NCard
      className="h-full"
      empty={contributions.length === 0}
      emptyText={emptyLabel}
      icon={icon}
      title={title}
    >
      {contributions.length > 0 ? (
        <>
          <div className="space-y-2">
            {contributions.map((contribution) => (
              rowHref ? (
                <Link
                  className="flex items-center justify-between gap-3 rounded-xl border border-border/70 p-3 hover:bg-muted/60"
                  href={rowHref}
                  key={contribution.id}
                >
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">
                      {money(contribution.amountMinor)}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {formatKafilDate(contribution.submittedAt, language)}
                    </span>
                  </span>
                  <StatusBadge status={contribution.status} />
                </Link>
              ) : (
                <div
                  className="flex items-center justify-between gap-3 rounded-xl border border-border/70 p-3"
                  key={contribution.id}
                >
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">
                      {money(contribution.amountMinor)}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {formatKafilDate(contribution.submittedAt, language)}
                    </span>
                  </span>
                  <StatusBadge status={contribution.status} />
                </div>
              )
            ))}
          </div>
          {footer}
        </>
      ) : null}
    </NCard>
  );
}
