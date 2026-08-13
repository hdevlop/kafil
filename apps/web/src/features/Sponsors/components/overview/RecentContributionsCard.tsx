"use client";

import type { LucideIcon } from "lucide-react";
import { NBadge, NCard, NEmptyState, useNajmFormat } from "najm-kit";
import Link from "next/link";
import type { ReactNode } from "react";


import type { ContributionEntry } from "../../types";

export function RecentContributionsCard({
  contributions,
  icon,
  title,
  emptyLabel,
  footer,
  rowHref,
}: Readonly<{
  contributions: ContributionEntry[];
  icon: LucideIcon;
  title: string;
  emptyLabel: string;
  footer?: ReactNode;
  rowHref?: string;
}>) {
  const fmt = useNajmFormat();
  const money = (value: number) => fmt.money(value);

  return (
    <NCard
      className="h-full"
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
                      {fmt.date(contribution.submittedAt)}
                    </span>
                  </span>
                  <NBadge status={contribution.status} />
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
                      {fmt.date(contribution.submittedAt)}
                    </span>
                  </span>
                  <NBadge status={contribution.status} />
                </div>
              )
            ))}
          </div>
          {footer}
        </>
      ) : (
        <NEmptyState
          className="min-h-40 py-8"
          icon={icon}
          title={emptyLabel}
        />
      )}
    </NCard>
  );
}
