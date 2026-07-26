export interface PlatformSettings {
  id: string;
  familyFundingTargetMinor: number;
  pendingContributionExpiryHours: number;
  formFillEnabled: boolean;
  currency: "MAD" | string;
  updatedByUserId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateSettingsInput {
  familyFundingTargetMinor: number;
  pendingContributionExpiryHours: number;
  formFillEnabled: boolean;
}

export interface FormFillSetting {
  enabled: boolean;
}