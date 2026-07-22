"use client";

import { CalendarDays, LockKeyhole, ReceiptText, WalletCards } from "lucide-react";
import { NStatCard } from "najm-kit";

import { formatMad } from "@/lib/format";

import type { FamilyBudgetSummary } from "../types";

export function FamilyBudgetSummaryCards({
  summary,
}: Readonly<{ summary: FamilyBudgetSummary }>) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <NStatCard icon={WalletCards} label="Available" value={formatMad(summary.availableMinor)} subtext="Ready for household orders" />
      <NStatCard icon={LockKeyhole} label="Reserved" value={formatMad(summary.reservedMinor)} subtext="Held for active orders" />
      <NStatCard
        icon={CalendarDays}
        label="Monthly limit"
        value={formatMad(summary.monthlyLimit?.limitMinor)}
        subtext={summary.monthlyLimit ? `Applies from ${summary.monthlyLimit.month}` : "No limit set for this month"}
      />
      <NStatCard icon={ReceiptText} label="Spent" value={formatMad(summary.spentMinor)} subtext="Captured for fulfilled orders" />
    </div>
  );
}
