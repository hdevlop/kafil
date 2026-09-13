"use client";

import type { LucideIcon } from "lucide-react";
import { NEmptyState, NLineChart, useNajmFormat } from "najm-kit";

import { toChartData } from "@/features/Dashboard/shared/chartData";

import type { ChartSeries, ContributionTrendPoint } from "../../types";

export function ContributionOverviewCard({
  data,
  emptyLabel,
  icon,
  series,
  title,
  valueFormatter,
}: Readonly<{
  data: ContributionTrendPoint[];
  emptyLabel?: string;
  icon: LucideIcon;
  series: ChartSeries[];
  title: string;
  valueFormatter: (value: number) => string;
}>) {
  const fmt = useNajmFormat();
  return (
    <NLineChart
      className="h-full"
      data={toChartData(data, series.map((item) => item.key), fmt)}
      emptyLabel={emptyLabel ? <NEmptyState icon={icon} title={emptyLabel} /> : undefined}
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
