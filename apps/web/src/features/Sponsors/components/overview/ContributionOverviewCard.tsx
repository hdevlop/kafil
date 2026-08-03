"use client";

import type { LucideIcon } from "lucide-react";
import { NCard, NCardAction } from "najm-kit";

import type { KafilLanguage } from "@/lib/format";

import type { ChartSeries, ContributionTrendPoint } from "../../types";

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
  const coordinates = (key: string) => data.map((point, index) => ({
    x: data.length <= 1 ? 50 : 3 + (index / (data.length - 1)) * 94,
    y: 94 - (Number(point[key] ?? 0) / maximum) * 82,
  }));

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
      <div className="min-w-0 overflow-hidden">
        <div aria-label={title} className="relative h-44" role="img">
          <div className="absolute inset-0 grid grid-rows-4" aria-hidden="true">
            {Array.from({ length: 4 }, (_, index) => (
              <span className="border-t border-border/60" key={index} />
            ))}
          </div>
          <svg aria-hidden="true" className="absolute inset-0 size-full" preserveAspectRatio="none" viewBox="0 0 100 100">
            <defs>
              <linearGradient id="sponsor-contribution-fill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor={series[0]?.color ?? "var(--primary)"} stopOpacity="0.22" />
                <stop offset="100%" stopColor={series[0]?.color ?? "var(--primary)"} stopOpacity="0" />
              </linearGradient>
            </defs>
            {series.map((item, index) => {
              const points = coordinates(item.key);
              const line = getSmoothLinePath(points);
              const area = index === 0 && points.length
                ? `${line} L ${points.at(-1)?.x ?? 97} 100 L ${points[0].x} 100 Z`
                : undefined;
              return (
                <g key={item.key}>
                  {area && <path d={area} fill="url(#sponsor-contribution-fill)" />}
                  <path
                    d={line}
                    fill="none"
                    stroke={item.color}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={index === 0 ? 3 : 2}
                    vectorEffect="non-scaling-stroke"
                  />
                  {points.map((point, pointIndex) => (
                    <circle
                      cx={point.x}
                      cy={point.y}
                      fill={item.color}
                      key={`${item.key}-${data[pointIndex]?.month}`}
                      r={index === 0 ? 1.4 : 1}
                      stroke="var(--card)"
                      strokeWidth="0.7"
                      vectorEffect="non-scaling-stroke"
                    />
                  ))}
                </g>
              );
            })}
          </svg>
        </div>
        <div className="grid grid-cols-12 px-1 pt-2">
          {data.map((point) => (
            <span className="truncate text-center text-[10px] text-muted-foreground" key={point.month}>
              {formatChartMonth(point.month, language)}
            </span>
          ))}
        </div>
      </div>
      <span className="sr-only">
        {data.flatMap((point) => series.map((item) => (
          `${formatChartMonth(point.month, language)} · ${item.label}: ${valueFormatter(Number(point[item.key] ?? 0))}`
        ))).join("; ")}
      </span>
    </NCard>
  );
}

function getSmoothLinePath(points: Array<{ x: number; y: number }>) {
  if (!points.length) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  return points.slice(1).reduce((path, point, index) => {
    const previous = points[index];
    const midpointX = (previous.x + point.x) / 2;
    return `${path} C ${midpointX} ${previous.y}, ${midpointX} ${point.y}, ${point.x} ${point.y}`;
  }, `M ${points[0].x} ${points[0].y}`);
}
