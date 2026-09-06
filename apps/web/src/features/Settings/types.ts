export interface PlatformSettings {
  id: string;
  familyFundingTargetMinor: number;
  pendingContributionExpiryHours: number;
  formFillEnabled: boolean;
  defaultMaxOrdersPerMonth: number | null;
  defaultMaxBudgetPerOrderMinor: number | null;
  defaultMonthlyBudgetMinor: number | null;
  currency: "MAD" | string;
  updatedByUserId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateSettingsInput {
  familyFundingTargetMinor: number;
  pendingContributionExpiryHours: number;
  formFillEnabled: boolean;
  defaultMaxOrdersPerMonth?: number | null;
  defaultMaxBudgetPerOrderMinor?: number | null;
  defaultMonthlyBudgetMinor?: number | null;
}

export interface FormFillSetting {
  enabled: boolean;
}