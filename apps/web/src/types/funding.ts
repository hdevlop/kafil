export type FundingCapacityStatus = "open" | "reserved" | "funded";

export interface FamilyFundingProgress {
  status: "pending_funding" | "active" | string;
  targetMinor: number;
  fundedMinor: number;
  pendingMinor: number;
  remainingMinor: number;
  availableToContributeMinor: number;
  capacityStatus: FundingCapacityStatus;
  nextPendingExpiryAt: string | null;
  activatedAt: string | null;
}