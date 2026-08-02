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
