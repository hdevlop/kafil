import type { OffsetPagination } from "@/lib/pagination";
import type { FamilyFundingProgress } from "@/types/funding";

export interface FamilyMonthlyBudgetLimit {
  month: string;
  limitMinor: number;
}

export interface FamilyBudgetSummary {
  currency: "MAD" | string;
  availableMinor: number;
  reservedMinor: number;
  spentMinor: number;
  monthlyLimit: FamilyMonthlyBudgetLimit | null;
  funding: FamilyFundingProgress;
}

export interface FamilyBudgetLedgerEntry {
  id: string;
  entryType: string;
  amountMinor: number;
  availableAfterMinor: number;
  reservedAfterMinor: number;
  spentAfterMinor: number;
  sourceType: string;
  createdAt: string;
}

export type FamilyBudgetLedgerQuery = OffsetPagination;
