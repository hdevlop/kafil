"use client";

import { NGrid, NGridItem, NStatCard } from "najm-kit";
import Link from "next/link";

import type { SponsorKpiItem } from "../../types";

export function SponsorKpiGrid({
  desktopColumns = 4,
  kpis,
  variant = "default",
}: Readonly<{
  desktopColumns?: 3 | 4 | 5;
  kpis: SponsorKpiItem[];
  variant?: "default" | "compact";
}>) {
  return (
    <NGrid cols={1} smCols={2} lgCols={desktopColumns}>
      {kpis.map((kpi) => {
        const card = (
          <NStatCard
            className="h-full"
            classNames={{
              label: "overflow-visible whitespace-normal text-clip leading-tight",
              value: "tabular-nums",
            }}
            icon={kpi.icon}
            label={kpi.label}
            value={kpi.value}
            {...(variant === "compact" ? { variant: "compact" as const } : {})}
          />
        );

        return (
          <NGridItem key={kpi.key} span={1}>
            {kpi.link ? (
              <Link className="block" href={kpi.link}>
                {card}
              </Link>
            ) : (
              card
            )}
          </NGridItem>
        );
      })}
    </NGrid>
  );
}
