"use client";

import type { LucideIcon } from "lucide-react";
import { NCard } from "najm-kit";
import type { ReactNode } from "react";

import type { KafilLanguage } from "@/lib/format";
import { formatMad } from "@/lib/format";

import type { BudgetSegment } from "../types";

export function SupportBudgetCard({
  icon,
  segments,
  total,
  title,
  totalLabel,
  language,
  emptyLabel,
  footer,
}: Readonly<{
  icon: LucideIcon;
  segments: BudgetSegment[];
  total: number;
  title: string;
  totalLabel: string;
  emptyLabel: string;
  language: KafilLanguage;
  footer?: ReactNode;
}>) {
  const money = (value: number) => formatMad(value, language);
  const isEmpty = total <= 0;

  return (
    <NCard className="h-full" icon={icon} title={title}>
      <div className="flex flex-col items-center gap-3">
        <div
          aria-label={title}
          className="grid shrink-0 place-items-center rounded-full"
          role="img"
          style={{
            background: isEmpty
              ? "conic-gradient(var(--muted) 0deg 360deg)"
              : `conic-gradient(${segments
                  .filter((s) => s.value > 0)
                  .reduce((stops, segment, index, arr) => {
                    const start = arr.slice(0, index).reduce((sum, s) => sum + (s.value / total) * 360, 0);
                    const end = start + (segment.value / total) * 360;
                    return `${stops}${stops ? ", " : ""}${segment.color} ${start}deg ${end}deg`;
                  }, "")})`,
            height: 96,
            width: 96,
          }}
        >
          <div className="grid size-[4.5rem] place-items-center rounded-full bg-card text-center">
            <div>
              <p className="text-xs font-semibold">{money(total)}</p>
              <p className="text-[9px] uppercase tracking-wide text-muted-foreground">
                {totalLabel}
              </p>
            </div>
          </div>
        </div>
        {isEmpty && (
          <p className="py-2 text-center text-sm text-muted-foreground">{emptyLabel}</p>
        )}
        <div className="w-full space-y-1.5">
          {segments.map((item) => (
            <div className="flex items-center justify-between gap-3 text-xs" key={item.label}>
              <span className="flex min-w-0 items-center gap-2 text-muted-foreground">
                <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="truncate">{item.label}</span>
              </span>
              <strong className="shrink-0">{money(item.value)}</strong>
            </div>
          ))}
        </div>
        {footer}
      </div>
    </NCard>
  );
}
