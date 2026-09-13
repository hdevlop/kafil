"use client";

import type { LucideIcon } from "lucide-react";
import { NCard, NDonutCard, NEmptyState, useNajmFormat } from "najm-kit";
import type { ReactNode } from "react";

import type { BudgetSegment } from "../../types";

export function SupportBudgetCard({
  icon,
  segments,
  title,
  total,
  totalLabel,
  emptyLabel,
  footer,
  compact = true,
}: Readonly<{
  icon: LucideIcon;
  segments: BudgetSegment[];
  total: number;
  title: string;
  totalLabel: string;
  emptyLabel: string;
  footer?: ReactNode;
  compact?: boolean;
}>) {
  const fmt = useNajmFormat();
  const money = (value: number) => fmt.money(value);
  const number = (value: number) => fmt.number(value / 100);

  // NDonutCard renders its emptyLabel inside a <p>, so a zero total gets an
  // app-level card composition instead of a nested state element.
  if (total <= 0) {
    return (
      <NCard className="h-full" icon={icon} title={title}>
        <NEmptyState
          className="min-h-40 py-8"
          icon={icon}
          title={emptyLabel}
        />
        {footer}
      </NCard>
    );
  }

  return (
    <NDonutCard
      className="h-full"
      icon={icon}
      title={title}
      items={segments.map((s, i) => ({ ...s, id: `seg-${i}` }))}
      valueFormatter={money}
      totalLabel={totalLabel}
      emptyLabel={emptyLabel}
      footer={footer}
      {...(compact
        ? {
            centerOrientation: "column" as const,
            centerUnit: "MAD",
            centerValueFormatter: number,
            layout: "horizontal" as const,
            variant: "compact" as const,
          }
        : {})}
    />
  );
}
