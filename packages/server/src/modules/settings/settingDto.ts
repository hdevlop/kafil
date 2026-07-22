import { z } from "zod";

import { positiveMinorAmountDto } from "../budgets/money";

export const updateFundingSettingDto = z.object({
  familyFundingTargetMinor: positiveMinorAmountDto,
  reason: z.string().trim().min(3).max(500),
});

export type UpdateFundingSettingDto = z.input<typeof updateFundingSettingDto>;
