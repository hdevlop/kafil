"use client";

import { NCard, NGrid, NGridItem, NPageLayout } from "najm-kit";

export function SponsorDashboardSkeleton() {
  return (
    <NPageLayout className="flex min-h-full flex-col gap-4">
      <NCard loading className="h-20" />
      <NGrid cols={1} smCols={2} xlCols={5}>
        {Array.from({ length: 5 }, (_, index) => (
          <NGridItem key={index} span={1}>
            <NCard loading className="h-24" />
          </NGridItem>
        ))}
      </NGrid>
      <NGrid cols={1} xlCols={12}>
        <NGridItem span={1} xlSpan={5}>
          <NCard loading className="h-80" />
        </NGridItem>
        <NGridItem span={1} xlSpan={3}>
          <NCard loading className="h-80" />
        </NGridItem>
        <NGridItem span={1} xlSpan={4}>
          <NCard loading className="h-80" />
        </NGridItem>
      </NGrid>
      <NGrid cols={1} xlCols={12}>
        <NGridItem span={1} xlSpan={5}>
          <NCard loading className="h-72" />
        </NGridItem>
        <NGridItem span={1} xlSpan={4}>
          <NCard loading className="h-72" />
        </NGridItem>
        <NGridItem span={1} xlSpan={3}>
          <NCard loading className="h-72" />
        </NGridItem>
      </NGrid>
    </NPageLayout>
  );
}
