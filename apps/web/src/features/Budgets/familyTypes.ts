import type { FamilyFundingProgress } from "@/types/funding";

export interface FamilyMonthlyBudgetLimit {
  month: string;
  limitMinor: number;
}

export interface FamilyBudgetSummary {
  currency: "MAD" | string;
  monthlyLimit: FamilyMonthlyBudgetLimit | null;
  funding: FamilyFundingProgress;
  month: string;
  monthlyUsedMinor: number;
  monthlyLimitMinor: number | null;
  monthlyRemainingMinor: number | null;
  ordersUsed?: number;
  ordersLimit?: number | null;
  ordersRemaining?: number | null;
  maxPerOrderMinor?: number | null;
}
