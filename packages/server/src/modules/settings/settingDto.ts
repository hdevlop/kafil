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

export const maxOrdersPerMonthDto = z.coerce
  .number()
  .int()
  .min(1)
  .max(31);

export const nullableMaxOrdersPerMonthDto = maxOrdersPerMonthDto.nullish();

export const nullableMinorAmountDto = positiveMinorAmountDto.nullish();

export const updateSettingsDto = z.object({
  familyFundingTargetMinor: positiveMinorAmountDto,
  pendingContributionExpiryHours: pendingContributionExpiryHoursDto,
  formFillEnabled: z.boolean(),
  defaultMaxOrdersPerMonth: nullableMaxOrdersPerMonthDto,
  defaultMaxBudgetPerOrderMinor: nullableMinorAmountDto,
  defaultMonthlyBudgetMinor: nullableMinorAmountDto,
});

export type UpdateSettingsDto = z.input<typeof updateSettingsDto>;