import { z } from "zod";

export const KAFIL_CURRENCY = "MAD" as const;
export const MAX_MINOR_UNITS = Number.MAX_SAFE_INTEGER;

export const currencyDto = z.literal(KAFIL_CURRENCY);
export const positiveMinorAmountDto = z.coerce
  .number()
  .int()
  .min(1)
  .max(MAX_MINOR_UNITS);
export const signedMinorAmountDto = z.coerce
  .number()
  .int()
  .min(-MAX_MINOR_UNITS)
  .max(MAX_MINOR_UNITS)
  .refine((amount) => amount !== 0, "Amount must not be zero");

export const budgetBalanceDto = z.object({
  availableMinor: z.number().int().nonnegative().max(MAX_MINOR_UNITS),
  reservedMinor: z.number().int().nonnegative().max(MAX_MINOR_UNITS),
  spentMinor: z.number().int().nonnegative().max(MAX_MINOR_UNITS),
});

export type BudgetBalance = z.output<typeof budgetBalanceDto>;
export type BudgetBalanceDelta = Partial<BudgetBalance>;

/**
 * Applies a signed delta while enforcing the invariant every persisted balance
 * is a safe, non-negative integer minor-unit value.
 */
export function applyBudgetBalanceDelta(
  balance: BudgetBalance,
  delta: BudgetBalanceDelta,
): BudgetBalance {
  const current = budgetBalanceDto.parse(balance);
  return budgetBalanceDto.parse({
    availableMinor: current.availableMinor + (delta.availableMinor ?? 0),
    reservedMinor: current.reservedMinor + (delta.reservedMinor ?? 0),
    spentMinor: current.spentMinor + (delta.spentMinor ?? 0),
  });
}
