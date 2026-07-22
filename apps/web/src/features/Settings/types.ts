export interface FundingSetting {
  id: string;
  familyFundingTargetMinor: number;
  currency: "MAD" | string;
  updatedAt: string;
}

export interface UpdateFundingSettingInput {
  familyFundingTargetMinor: number;
  reason: string;
}
