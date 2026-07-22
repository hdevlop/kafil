export interface FamilyFundingProgress {
  status: "pending_funding" | "active" | string;
  targetMinor: number;
  fundedMinor: number;
  remainingMinor: number;
  activatedAt: string | null;
}
