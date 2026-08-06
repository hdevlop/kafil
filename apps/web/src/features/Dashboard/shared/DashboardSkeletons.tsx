"use client";

import { House, LayoutDashboard } from "lucide-react";
import {
  NPageHeader,
  NCard,
  NChartSkeleton,
  NGrid,
  NGridItem,
  NPageLayout,
  NSkeletonEventList,
  NSkeletonWidgets,
  NStatCardSkeleton,
} from "najm-kit";


function StatSkeletonGrid({ count, xlColumns }: Readonly<{ count: number; xlColumns: 5 | 6 }>) {
  return (
    <NGrid cols={2} lgCols={3} xlCols={xlColumns}>
      {Array.from({ length: count }, (_, index) => (
        <NGridItem key={index} span={1}>
          <NStatCardSkeleton />
        </NGridItem>
      ))}
    </NGrid>
  );
}

function ChartSkeletonCard({
  loadingLabel,
  variant,
}: Readonly<{ loadingLabel: string; variant: "bar" | "line" | "pie" | "status" }>) {
  return (
    <NCard className="h-full" title={loadingLabel}>
      <NChartSkeleton variant={variant} />
    </NCard>
  );
}

function ListSkeletonCard({ loadingLabel }: Readonly<{ loadingLabel: string }>) {
  return (
    <NCard className="h-full" title={loadingLabel}>
      <NSkeletonEventList count={4} />
    </NCard>
  );
}

export function AdminDashboardSkeleton({
  loadingLabel,
  title,
}: Readonly<{ loadingLabel: string; title: string }>) {
  return (
    <NPageLayout className="flex min-h-full flex-col gap-4">
      <NPageHeader icon={LayoutDashboard} subtitle={loadingLabel} title={title} />
      <StatSkeletonGrid count={6} xlColumns={6} />
      <NGrid cols={1} xlCols={12}>
        <NGridItem span={1} xlSpan={3}><ChartSkeletonCard loadingLabel={loadingLabel} variant="pie" /></NGridItem>
        <NGridItem span={1} xlSpan={6}><ChartSkeletonCard loadingLabel={loadingLabel} variant="line" /></NGridItem>
        <NGridItem span={1} xlSpan={3}><ChartSkeletonCard loadingLabel={loadingLabel} variant="pie" /></NGridItem>
      </NGrid>
      <NGrid className="flex-1" cols={1} mdCols={2} xlCols={12}>
        <NGridItem span={1} xlSpan={3}><ChartSkeletonCard loadingLabel={loadingLabel} variant="status" /></NGridItem>
        {Array.from({ length: 3 }, (_, index) => (
          <NGridItem key={index} span={1} xlSpan={3}><ListSkeletonCard loadingLabel={loadingLabel} /></NGridItem>
        ))}
      </NGrid>
    </NPageLayout>
  );
}

export function FamilyDashboardSkeleton({ loadingLabel }: Readonly<{ loadingLabel: string }>) {
  return (
    <NPageLayout className="flex min-h-full flex-col gap-4">
      <NPageHeader icon={House} subtitle={loadingLabel} title={loadingLabel} />
      <StatSkeletonGrid count={6} xlColumns={6} />
      <NGrid cols={1} xlCols={12}>
        <NGridItem span={1} xlSpan={3}><ListSkeletonCard loadingLabel={loadingLabel} /></NGridItem>
        <NGridItem span={1} xlSpan={6}><ChartSkeletonCard loadingLabel={loadingLabel} variant="bar" /></NGridItem>
        <NGridItem span={1} xlSpan={3}><ChartSkeletonCard loadingLabel={loadingLabel} variant="pie" /></NGridItem>
      </NGrid>
      <NGrid className="flex-1" cols={1} lgCols={3}>
        <ChartSkeletonCard loadingLabel={loadingLabel} variant="status" />
        <ListSkeletonCard loadingLabel={loadingLabel} />
        <ListSkeletonCard loadingLabel={loadingLabel} />
      </NGrid>
    </NPageLayout>
  );
}

export function SponsorDashboardSkeleton({
  loadingLabel,
  title,
}: Readonly<{ loadingLabel: string; title: string }>) {
  return (
    <NPageLayout className="flex min-h-full flex-col gap-4 xl:h-full xl:min-h-0">
      <NPageHeader icon={LayoutDashboard} subtitle={loadingLabel} title={title} />
      <StatSkeletonGrid count={5} xlColumns={5} />
      <NGrid className="flex-1 xl:min-h-0 xl:grid-rows-[auto_minmax(0,1fr)]" cols={1} mdCols={2} xlCols={12}>
        <NGridItem span={1} xlSpan={3}><ListSkeletonCard loadingLabel={loadingLabel} /></NGridItem>
        <NGridItem span={1} xlSpan={6}><ChartSkeletonCard loadingLabel={loadingLabel} variant="line" /></NGridItem>
        <NGridItem span={1} xlSpan={3}><ChartSkeletonCard loadingLabel={loadingLabel} variant="pie" /></NGridItem>
        {Array.from({ length: 3 }, (_, index) => (
          <NGridItem key={index} span={1} xlSpan={3}><ListSkeletonCard loadingLabel={loadingLabel} /></NGridItem>
        ))}
        <NGridItem span={1} xlSpan={3}>
          <NCard className="h-full" title={loadingLabel}><NSkeletonWidgets count={3} /></NCard>
        </NGridItem>
      </NGrid>
    </NPageLayout>
  );
}
