"use client";

import { Boxes, LockKeyhole, PackageCheck, RotateCcw } from "lucide-react";
import { NGrid, NGridItem, NStatCard } from "najm-kit";

import { formatKafilNumber } from "@/lib/format";

import type { InventoryBalance } from "../types";

export function InventorySummaryCards({
  balance,
}: Readonly<{ balance: InventoryBalance }>) {
  const availableQuantity = balance.onHandQuantity - balance.reservedQuantity;

  return (
    <NGrid cols={2} mdCols={2} xlCols={4}>
      <NGridItem span={1}>
        <NStatCard variant="compact" icon={Boxes} label="On hand" value={formatKafilNumber(balance.onHandQuantity)} className="sm:hidden" />
        <NStatCard icon={Boxes} label="On hand" value={formatKafilNumber(balance.onHandQuantity)} subtext="Physical quantity recorded" className="hidden sm:block" />
      </NGridItem>
      <NGridItem span={1}>
        <NStatCard variant="compact" icon={LockKeyhole} label="Reserved" value={formatKafilNumber(balance.reservedQuantity)} className="sm:hidden" />
        <NStatCard icon={LockKeyhole} label="Reserved" value={formatKafilNumber(balance.reservedQuantity)} subtext="Held for active orders" className="hidden sm:block" />
      </NGridItem>
      <NGridItem span={1}>
        <NStatCard variant="compact" icon={PackageCheck} label="Available" value={formatKafilNumber(availableQuantity)} className="sm:hidden" />
        <NStatCard icon={PackageCheck} label="Available" value={formatKafilNumber(availableQuantity)} subtext="Ready for new orders" className="hidden sm:block" />
      </NGridItem>
      <NGridItem span={1}>
        <NStatCard variant="compact" icon={RotateCcw} label="Balance version" value={formatKafilNumber(balance.version)} className="sm:hidden" />
        <NStatCard icon={RotateCcw} label="Balance version" value={formatKafilNumber(balance.version)} subtext="Changes after each inventory command" className="hidden sm:block" />
      </NGridItem>
    </NGrid>
  );
}
