"use client";

import type { LucideIcon } from "lucide-react";
import { NDonutCard, useNajmFormat } from "najm-kit";
import type { ReactNode } from "react";

import type { BudgetSegment } from "../../types";

export function SupportBudgetCard({
  icon,
  segments,
  title,
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
