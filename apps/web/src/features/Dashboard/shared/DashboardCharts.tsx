"use client";

import type { LucideIcon } from "lucide-react";
import { NCard } from "najm-kit";

import { formatKafilNumber, type KafilLanguage } from "@/lib/format";

interface ChartSeries {
  key: string;
  label: string;
  color: string;
}

export function MonthlyBarChart({
  data,
  icon,
  language,
  series,
  title,
  valueFormatter,
}: Readonly<{
  data: Array<Record<string, number | string> & { month: string }>;
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
    <NCard className="h-full min-w-0 overflow-hidden" icon={icon} title={title}>
      <div className="mb-3 flex flex-wrap gap-x-3 gap-y-1 sm:mb-4 sm:gap-4">
        {series.map((item) => (
          <span className="flex items-center gap-2 text-xs text-muted-foreground" key={item.key}>
            <span className="size-2.5 rounded-full" style={{ backgroundColor: item.color }} />
            {item.label}
          </span>
        ))}
      </div>
      <div
          aria-label={title}
          className="grid h-44 min-w-0 grid-cols-12 items-end gap-0.5 border-b border-border/80 px-0.5 pt-3 sm:h-52 sm:gap-2 sm:px-1 sm:pt-4"
          role="img"
        >
          {data.map((point) => (
            <div className="flex h-full min-w-0 flex-col justify-end gap-2" key={point.month}>
              <div className="flex min-w-0 flex-1 items-end justify-center gap-px sm:gap-1">
                {series.map((item) => {
                  const value = Number(point[item.key] ?? 0);
                  const height = value === 0 ? 3 : Math.max(8, Math.round((value / maximum) * 150));
                  return (
                    <div
                      aria-label={`${item.label}: ${valueFormatter(value)}`}
                      className="min-w-px w-full max-w-4 rounded-t-sm transition-opacity hover:opacity-80 sm:rounded-t-md"
                      key={item.key}
                      style={{ backgroundColor: item.color, height }}
                      title={`${item.label}: ${valueFormatter(value)}`}
                    />
                  );
                })}
              </div>
              <span className="truncate text-center text-[8px] leading-none text-muted-foreground sm:text-[10px]">
                {formatChartMonth(point.month, language)}
              </span>
            </div>
          ))}
      </div>
    </NCard>
  );
}

export function MonthlyLineChart({
  data,
  icon,
  language,
  series,
  title,
  valueFormatter,
}: Readonly<{
  data: Array<Record<string, number | string> & { month: string }>;
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
      <div className="mb-4 flex flex-wrap gap-4">
        {series.map((item) => (
          <span className="flex items-center gap-2 text-xs text-muted-foreground" key={item.key}>
            <span className="size-2.5 rounded-full" style={{ backgroundColor: item.color }} />
            {item.label}
          </span>
        ))}
      </div>
      <div className="min-w-0 overflow-hidden pb-1">
        <div className="w-full min-w-0">
          <div aria-label={title} className="relative h-44" role="img">
            <svg aria-hidden="true" className="absolute inset-0 size-full" preserveAspectRatio="none" viewBox="0 0 100 100">
              {series.map((item) => (
                <path
                  d={getSmoothLinePath(
                    data.map((point, index) => getLineCoordinate(index, data.length, Number(point[item.key] ?? 0), maximum)),
                  )}
                  fill="none"
                  key={item.key}
                  stroke={item.color}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="3"
                  vectorEffect="non-scaling-stroke"
                />
              ))}
            </svg>
            <span className="sr-only">
              {data.flatMap((point) => series.map((item) => (
                `${formatChartMonth(point.month, language)} · ${item.label}: ${valueFormatter(Number(point[item.key] ?? 0))}`
              ))).join("; ")}
            </span>
          </div>
          <div className="grid grid-cols-12 px-1 pt-2">
            {data.map((point) => (
              <span className="truncate text-center text-[10px] text-muted-foreground" key={point.month}>
                {formatChartMonth(point.month, language)}
              </span>
            ))}
          </div>
        </div>
      </div>
    </NCard>
  );
}

function getLineCoordinate(index: number, count: number, value: number, maximum: number) {
  return {
    x: count <= 1 ? 50 : 2 + (index / (count - 1)) * 96,
    y: 96 - (value / maximum) * 88,
  };
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

function formatChartMonth(month: string, language: KafilLanguage) {
  return new Intl.DateTimeFormat(language === "ar" ? "ar-MA" : language === "fr" ? "fr-MA" : "en-MA", {
    month: "short",
    timeZone: "UTC",
  }).format(new Date(`${month}-01T00:00:00.000Z`));
}

export function PieBreakdown({
  data,
  icon,
  title,
  valueFormatter,
}: Readonly<{
  data: Array<{ label: string; value: number; color: string }>;
  icon: LucideIcon;
  title: string;
  valueFormatter: (value: number) => string;
}>) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const slices = getPieSlices(data, total);

  return (
    <NCard className="h-full" icon={icon} title={title}>
      <div className="flex flex-row items-center gap-4 sm:flex-col sm:gap-5">
        <svg aria-label={title} className="h-auto w-40 shrink-0" role="img" viewBox="40 26 140 140">
          {slices.map((slice) => (
            <path d={slice.path} fill={slice.color} key={slice.label} stroke="var(--card)" strokeWidth="1.5" />
          ))}
          {slices.map((slice) => (
            <g key={`${slice.label}-percentage`}>
              <rect
                fill="var(--card)"
                height="20"
                rx="3"
                width="42"
                x={slice.percentagePoint.x - 21}
                y={slice.percentagePoint.y - 10}
              />
              <text
                dominantBaseline="middle"
                fill="var(--foreground)"
                fontSize="11"
                fontWeight="700"
                textAnchor="middle"
                x={slice.percentagePoint.x}
                y={slice.percentagePoint.y + 0.5}
              >
                {slice.percentage.toFixed(1)}%
              </text>
            </g>
          ))}
        </svg>
        <div className="min-w-0 flex-1 space-y-3 sm:w-full sm:flex-none">
          {data.map((item) => (
            <div className="flex items-center justify-between gap-3 text-sm" key={item.label}>
              <span className="flex min-w-0 items-center gap-2 text-muted-foreground">
                <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="truncate">{item.label}</span>
              </span>
              <strong className="shrink-0" style={{ color: item.color }}>{valueFormatter(item.value)}</strong>
            </div>
          ))}
        </div>
      </div>
    </NCard>
  );
}

const PIE_CENTER = { x: 110, y: 96 };
const PIE_RADIUS = 58;

function getPieSlices(data: Array<{ label: string; value: number; color: string }>, total: number) {
  let startAngle = -90;

  return data.flatMap((item) => {
    if (item.value <= 0 || total <= 0) return [];

    const percentage = (item.value / total) * 100;
    const endAngle = startAngle + (percentage / 100) * 360;
    const midpoint = startAngle + (endAngle - startAngle) / 2;
    const percentagePoint = pointAt(midpoint, PIE_RADIUS * 0.62);
    const slice = {
      color: item.color,
      label: item.label,
      path: describePieSlice(startAngle, endAngle),
      percentage,
      percentagePoint,
    };
    startAngle = endAngle;
    return [slice];
  });
}

function describePieSlice(startAngle: number, endAngle: number) {
  if (endAngle - startAngle >= 359.999) {
    return `M ${PIE_CENTER.x} ${PIE_CENTER.y - PIE_RADIUS} a ${PIE_RADIUS} ${PIE_RADIUS} 0 1 1 0 ${PIE_RADIUS * 2} a ${PIE_RADIUS} ${PIE_RADIUS} 0 1 1 0 -${PIE_RADIUS * 2}`;
  }

  const start = pointAt(startAngle, PIE_RADIUS);
  const end = pointAt(endAngle, PIE_RADIUS);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${PIE_CENTER.x} ${PIE_CENTER.y} L ${start.x} ${start.y} A ${PIE_RADIUS} ${PIE_RADIUS} 0 ${largeArc} 1 ${end.x} ${end.y} Z`;
}

function pointAt(angle: number, radius: number) {
  const radians = (angle * Math.PI) / 180;
  return {
    x: Math.round((PIE_CENTER.x + Math.cos(radians) * radius) * 100) / 100,
    y: Math.round((PIE_CENTER.y + Math.sin(radians) * radius) * 100) / 100,
  };
}

export function StatusBreakdown({
  data,
  emptyLabel,
  icon,
  labelForStatus,
  language,
  title,
  xlOnlyStatuses = [],
}: Readonly<{
  data: Array<{ status: string; count: number }>;
  emptyLabel: string;
  icon: LucideIcon;
  labelForStatus: (status: string) => string;
  language: KafilLanguage;
  title: string;
  xlOnlyStatuses?: string[];
}>) {
  const maximum = Math.max(1, ...data.map((item) => item.count));
  return (
    <NCard className="h-full" icon={icon} title={title}>
      <div className="space-y-3">
        {data.length ? data.map((item) => (
          <div
            className={`space-y-1.5 ${xlOnlyStatuses.includes(item.status) ? "hidden xl:block" : ""}`}
            key={item.status}
          >
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="text-muted-foreground">{labelForStatus(item.status)}</span>
              <strong>{formatKafilNumber(item.count, language)}</strong>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(4, (item.count / maximum) * 100)}%` }} />
            </div>
          </div>
        )) : <p className="py-8 text-center text-sm text-muted-foreground">{emptyLabel}</p>}
      </div>
    </NCard>
  );
}
