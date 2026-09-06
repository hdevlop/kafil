export type OrderPolicySource = "family" | "global" | "unlimited";

export interface MonthlyBudgetLimit {
  month: string;
  limitMinor: number;
}

export interface OrderPolicySlice {
  override: number | null;
  default: number | null;
  effective: number | null;
  source: OrderPolicySource;
}

export interface OrderCountSlice extends OrderPolicySlice {
  used: number;
  remaining: number | null;
}

export interface MonthlyPolicySlice extends OrderPolicySlice {
  usedMinor: number;
}

export interface BudgetSummary {
  currency: "MAD" | string;
  availableMinor: number;
  reservedMinor: number;
  spentMinor: number;
  version: number;
  monthlyLimit: MonthlyBudgetLimit | null;
  funding: FamilyFundingProgress | null;
  month?: string;
  monthlyUsedMinor?: number;
  monthlyLimitMinor?: number | null;
  ordersUsed?: number;
  ordersLimit?: number | null;
  ordersRemaining?: number | null;
  maxPerOrderMinor?: number | null;
  monthly?: MonthlyPolicySlice;
  orders?: OrderCountSlice;
  maxPerOrder?: OrderPolicySlice;
}
import type { FamilyFundingProgress } from "@/types/funding";

export interface SetFamilyOrderPolicyInput {
  familyProfileId: string;
  maxOrdersPerMonth?: number | null;
  maxBudgetPerOrderMinor?: number | null;
  reason: string;
}

export interface SetMonthlyLimitInput {
  familyProfileId: string;
  month: string;
  limitMinor: number;
  reason: string;
}

export interface ResetMonthlyLimitInput {
  familyProfileId: string;
  month: string;
  reason: string;
}
