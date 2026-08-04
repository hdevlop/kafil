"use client";

import { NCard, NGrid, NGridItem } from "najm-kit";

export function SponsorOverviewSkeleton() {
  return (
    <div className="space-y-4">
      <NGrid cols={1} smCols={2} xlCols={4}>
        {Array.from({ length: 4 }, (_, index) => (
          <NGridItem key={index} span={1}>
            <NCard loading className="h-16" />
          </NGridItem>
        ))}
      </NGrid>
      <NCard loading className="h-60" />
      <NGrid cols={1} lgCols={12}>
        <NGridItem span={1} lgSpan={5}>
          <NCard loading className="h-80" />
        </NGridItem>
        <NGridItem span={1} lgSpan={7}>
          <NCard loading className="h-80" />
        </NGridItem>
      </NGrid>
      <NGrid cols={1} lgCols={2}>
        <NGridItem span={1}>
          <NCard loading className="h-64" />
        </NGridItem>
        <NGridItem span={1}>
          <NCard loading className="h-64" />
        </NGridItem>
      </NGrid>
    </div>
  );
}
