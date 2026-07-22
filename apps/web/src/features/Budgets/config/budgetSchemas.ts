import { z } from "zod";

import type {
  ManualBudgetAdjustmentInput,
  SetMonthlyBudgetLimitInput,
} from "../types";

const madAmountPattern = /^-?\d+(?:[.,]\d{1,2})?$/;
const maximumMinorUnits = BigInt(Number.MAX_SAFE_INTEGER);

export function parseMadAmount(value: string) {
  const normalized = value.trim().replace(",", ".");
  if (!madAmountPattern.test(normalized)) return null;

  const negative = normalized.startsWith("-");
  const [whole, fraction = ""] = normalized.replace("-", "").split(".");
  const minor = BigInt(`${whole}${fraction.padEnd(2, "0")}`);

  if (minor > maximumMinorUnits) return null;

  return Number(negative ? -minor : minor);
}

const positiveMadAmount = z
  .string()
  .trim()
  .regex(madAmountPattern, "Enter an amount with up to two decimals")
  .refine(
    (value) => {
      const minor = parseMadAmount(value);
      return minor !== null && minor > 0;
    },
    "Enter a positive MAD amount within the supported range",
  );

const signedMadAmount = z
  .string()
  .trim()
  .regex(madAmountPattern, "Enter an amount with up to two decimals")
  .refine(
    (value) => {
      const minor = parseMadAmount(value);
      return minor !== null && minor !== 0;
    },
    "Enter a non-zero MAD amount within the supported range",
  );

export const monthlyBudgetLimitFormSchema = z.object({
  month: z.iso.date().refine((month) => month.endsWith("-01"), {
    message: "Choose the first day of the month",
  }),
  limitMad: positiveMadAmount,
  reason: z.string().trim().min(3, "Give a short reason").max(500),
});

export const manualBudgetAdjustmentFormSchema = z.object({
  amountMad: signedMadAmount,
  reason: z.string().trim().min(3, "Give a short reason").max(500),
});

export type MonthlyBudgetLimitFormValues = z.infer<
  typeof monthlyBudgetLimitFormSchema
>;
export type ManualBudgetAdjustmentFormValues = z.infer<
  typeof manualBudgetAdjustmentFormSchema
>;

export function currentMonthFirstDay(now = new Date()) {
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

export function minorUnitsToMadInput(minorUnits: number) {
  return (minorUnits / 100).toFixed(2);
}

export function toMonthlyBudgetLimitInput(
  values: MonthlyBudgetLimitFormValues,
): SetMonthlyBudgetLimitInput {
  const limitMinor = parseMadAmount(values.limitMad);
  if (limitMinor === null || limitMinor <= 0) {
    throw new Error("Invalid monthly limit");
  }

  return { month: values.month, limitMinor, reason: values.reason };
}

export function toManualBudgetAdjustmentInput(
  values: ManualBudgetAdjustmentFormValues,
  idempotencyKey: string,
): ManualBudgetAdjustmentInput {
  const amountMinor = parseMadAmount(values.amountMad);
  if (amountMinor === null || amountMinor === 0) {
    throw new Error("Invalid budget adjustment");
  }

  return { amountMinor, idempotencyKey, reason: values.reason };
}
