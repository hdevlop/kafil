import { z } from "zod";

import { positiveMinorAmountDto, signedMinorAmountDto } from "./money";

export const budgetFamilyIdParams = z.object({
  familyProfileId: z.uuid(),
});

export const budgetLedgerListQuery = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export const setMonthlyBudgetLimitDto = z.object({
  month: z.iso.date().refine((month) => month.endsWith("-01"), {
    message: "Month must be the first day of its month.",
  }),
  limitMinor: positiveMinorAmountDto,
  reason: z.string().trim().min(3).max(500),
});

export const manualBudgetAdjustmentDto = z.object({
  amountMinor: signedMinorAmountDto,
  idempotencyKey: z.string().trim().min(8).max(160),
  reason: z.string().trim().min(3).max(500),
});

export type BudgetLedgerListQuery = z.input<typeof budgetLedgerListQuery>;
export type SetMonthlyBudgetLimitDto = z.input<typeof setMonthlyBudgetLimitDto>;
export type ManualBudgetAdjustmentDto = z.input<
  typeof manualBudgetAdjustmentDto
>;
