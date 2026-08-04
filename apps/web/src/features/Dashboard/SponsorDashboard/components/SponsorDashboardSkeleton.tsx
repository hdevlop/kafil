"use client";

import { NCard, NGrid, NGridItem, NPageLayout } from "najm-kit";

export function SponsorDashboardSkeleton() {
  return (
    <NPageLayout className="flex min-h-full flex-col gap-4 xl:h-full xl:min-h-0">
      <NCard loading className="h-20" />
      <NGrid cols={1} smCols={2} xlCols={5}>
        {Array.from({ length: 5 }, (_, index) => (
          <NGridItem key={index} span={1}>
            <NCard loading className="h-24" />
          </NGridItem>
        ))}
      </NGrid>
      <NGrid
        cols={1}
        mdCols={2}
        xlCols={12}
        className="flex-1 xl:min-h-0 xl:grid-rows-[auto_minmax(0,1fr)]"
      >
        <NGridItem span={1} xlSpan={3}>
          <NCard loading className="h-80" />
        </NGridItem>
        <NGridItem span={1} xlSpan={6}>
          <NCard loading className="h-80" />
        </NGridItem>
        <NGridItem span={1} xlSpan={3}>
          <NCard loading className="h-80" />
        </NGridItem>
        {Array.from({ length: 4 }, (_, index) => (
          <NGridItem key={index} span={1} xlSpan={3}>
            <NCard loading className="h-72" />
          </NGridItem>
        ))}
      </NGrid>
    </NPageLayout>
  );
}
