"use client";

import type { LucideIcon } from "lucide-react";
import { NCard, NCardAction } from "najm-kit";

import type { KafilLanguage } from "@/lib/format";

import type { ChartSeries, ContributionTrendPoint } from "../types";

function formatChartMonth(month: string, language: KafilLanguage) {
  return new Intl.DateTimeFormat(language === "ar" ? "ar-MA" : language === "fr" ? "fr-MA" : "en-MA", {
    month: "short",
    timeZone: "UTC",
  }).format(new Date(`${month}-01T00:00:00.000Z`));
}

export function ContributionOverviewCard({
  data,
  icon,
  language,
  series,
  title,
  valueFormatter,
}: Readonly<{
  data: ContributionTrendPoint[];
  icon: LucideIcon;
  language: KafilLanguage;
  series: ChartSeries[];
  title: string;
  valueFormatter: (value: number) => string;
}>) {
  const maximum = Math.max(
    1,
    ...data.flatMap((point) => series.map((item) => Number(point[item.key] ?? 0))),
  );

  return (
    <NCard className="h-full" icon={icon} title={title}>
      <NCardAction>
        <div className="flex flex-wrap gap-3">
          {series.map((item) => (
            <span className="flex items-center gap-2 text-xs text-muted-foreground" key={item.key}>
              <span className="size-2.5 rounded-full" style={{ backgroundColor: item.color }} />
              {item.label}
            </span>
          ))}
        </div>
      </NCardAction>
      <div
        aria-label={title}
        className="grid min-h-28 flex-1 grid-cols-12 items-end gap-1 border-b border-border/80 px-1 pt-2"
        role="img"
      >
        {data.map((point) => (
          <div className="flex h-full min-w-0 flex-col justify-end gap-1" key={point.month}>
            <div className="flex flex-1 items-end justify-center gap-0.5">
              {series.map((item) => {
                const value = Number(point[item.key] ?? 0);
                const height = value === 0 ? 2 : Math.max(5, Math.round((value / maximum) * 78));
                return (
                  <div
                    aria-label={`${item.label}: ${valueFormatter(value)}`}
                    className="w-full max-w-3 rounded-t-md transition-opacity hover:opacity-80"
                    key={item.key}
                    style={{ backgroundColor: item.color, height }}
                    title={`${item.label}: ${valueFormatter(value)}`}
                  />
                );
              })}
            </div>
            <span className="truncate text-center text-[10px] text-muted-foreground">
              {formatChartMonth(point.month, language)}
            </span>
          </div>
        ))}
      </div>
      <span className="sr-only">
        {data.flatMap((point) => series.map((item) => (
          `${formatChartMonth(point.month, language)} · ${item.label}: ${valueFormatter(Number(point[item.key] ?? 0))}`
        ))).join("; ")}
      </span>
    </NCard>
  );
}
