"use client";

import type { LucideIcon } from "lucide-react";
import { NLineChart } from "najm-kit";

import { toChartData } from "@/features/Dashboard/shared/chartData";
import type { KafilLanguage } from "@/lib/format";

import type { ChartSeries, ContributionTrendPoint } from "../../types";

export function ContributionOverviewCard({
  data,
  emptyLabel,
  icon,
  language,
  series,
  title,
  valueFormatter,
}: Readonly<{
  data: ContributionTrendPoint[];
  emptyLabel?: string;
  icon: LucideIcon;
  language: KafilLanguage;
  series: ChartSeries[];
  title: string;
  valueFormatter: (value: number) => string;
}>) {
  return (
    <NLineChart
      className="h-full"
      data={toChartData(data, series.map((item) => item.key), language)}
      emptyLabel={emptyLabel}
      icon={icon}
      series={series.map((item) => ({
        id: item.key,
        label: item.label,
        ...(item.color ? { color: item.color } : {}),
      }))}
      title={title}
      valueFormatter={valueFormatter}
    />
  );
}
