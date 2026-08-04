"use client";

import type { LucideIcon } from "lucide-react";
import { NDonutCard } from "najm-kit";
import type { ReactNode } from "react";

import type { KafilLanguage } from "@/lib/format";
import { formatKafilNumber, formatMad } from "@/lib/format";

import type { BudgetSegment } from "../../types";

export function SupportBudgetCard({
  icon,
  segments,
  title,
  totalLabel,
  language,
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
  language: KafilLanguage;
  footer?: ReactNode;
  compact?: boolean;
}>) {
  const money = (value: number) => formatMad(value, language);
  const number = (value: number) => formatKafilNumber(value / 100, language);

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
