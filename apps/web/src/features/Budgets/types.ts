export interface MonthlyBudgetLimit {
  month: string;
  limitMinor: number;
}

export interface BudgetSummary {
  currency: "MAD" | string;
  availableMinor: number;
  reservedMinor: number;
  spentMinor: number;
  version: number;
  monthlyLimit: MonthlyBudgetLimit | null;
  funding: FamilyFundingProgress | null;
}
import type { FamilyFundingProgress } from "@/types/funding";
