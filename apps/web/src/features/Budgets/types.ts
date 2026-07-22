export interface BudgetFamily {
  id: string;
  guardianLegalName: string;
  exactAddress: string;
  phone: string | null;
}

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

export interface BudgetLedgerEntry {
  id: string;
  budgetAccountId: string;
  entryType: string;
  amountMinor: number;
  availableAfterMinor: number;
  reservedAfterMinor: number;
  spentAfterMinor: number;
  sourceType: string;
  sourceId: string;
  idempotencyKey: string;
  actorUserId: string | null;
  reason: string | null;
  reversesEntryId: string | null;
  createdAt: string;
  sponsorName: string | null;
  sponsorImage: string | null;
  sponsorGender: "F" | "M" | null;
  sponsorPhone: string | null;
  contributionStatus: string | null;
  paymentMethod: string | null;
  externalReference: string | null;
}

export interface SetMonthlyBudgetLimitInput {
  month: string;
  limitMinor: number;
  reason: string;
}

export interface ManualBudgetAdjustmentInput {
  amountMinor: number;
  idempotencyKey: string;
  reason: string;
}
import type { FamilyFundingProgress } from "@/types/funding";
