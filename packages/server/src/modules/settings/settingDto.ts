import { z } from "zod";

import { positiveMinorAmountDto } from "../budgets/money";
import {
  MAX_PENDING_CONTRIBUTION_EXPIRY_HOURS,
  MIN_PENDING_CONTRIBUTION_EXPIRY_HOURS,
} from "./settingSchema";

export const pendingContributionExpiryHoursDto = z.coerce
  .number()
  .int()
  .min(MIN_PENDING_CONTRIBUTION_EXPIRY_HOURS)
  .max(MAX_PENDING_CONTRIBUTION_EXPIRY_HOURS);

export const updateSettingsDto = z.object({
  familyFundingTargetMinor: positiveMinorAmountDto,
  pendingContributionExpiryHours: pendingContributionExpiryHoursDto,
  formFillEnabled: z.boolean(),
});

export type UpdateSettingsDto = z.input<typeof updateSettingsDto>;