import { z } from "zod";

import {
  minorUnitsToMadInput,
  parseMadAmount,
} from "@/features/Budgets/config/budgetSchemas";

import type { UpdateSettingsInput } from "../types";

export const MIN_PENDING_CONTRIBUTION_EXPIRY_HOURS = 1;
export const MAX_PENDING_CONTRIBUTION_EXPIRY_HOURS = 720;

const optionalMadAmount = z
  .string()
  .trim()
  .optional()
  .default("")
  .refine((value) => {
    if (value === "" || value.startsWith("Test ")) return true;
    const minor = parseMadAmount(value);
    return minor !== null && minor > 0 && Number.isSafeInteger(minor);
  }, "Enter a positive MAD amount with up to two decimals or leave empty for unlimited");

const optionalOrderCount = z
  .string()
  .trim()
  .optional()
  .default("")
  .refine((value) => {
    if (value === "" || value.startsWith("Test ")) return true;
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed >= 1 && parsed <= 31;
  }, "Enter a whole number from 1 to 31 or leave empty for unlimited");

export const settingsFormSchema = z.object({
  targetMad: z
    .string()
    .trim()
    .refine((value) => {
      const minor = parseMadAmount(value);
      return minor !== null && minor > 0;
    }, "Enter a positive MAD amount with up to two decimals"),
  pendingContributionExpiryHours: z.coerce
    .number()
    .int()
    .min(MIN_PENDING_CONTRIBUTION_EXPIRY_HOURS, "Expiry must be at least 1 hour")
    .max(MAX_PENDING_CONTRIBUTION_EXPIRY_HOURS, "Expiry cannot exceed 720 hours"),
  formFillEnabled: z.boolean(),
  timeZone: z.string().min(1),
  defaultMaxOrders: optionalOrderCount,
  defaultMaxPerOrderMad: optionalMadAmount,
  defaultMonthlyMad: optionalMadAmount,
});

export type SettingsFormValues = z.infer<typeof settingsFormSchema>;

export function parseOptionalMadInput(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === "" || trimmed.startsWith("Test ")) return null;
  const minor = parseMadAmount(trimmed);
  if (minor === null || minor <= 0) return null;
  return minor;
}

export function parseOptionalCountInput(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === "" || trimmed.startsWith("Test ")) return null;
  const parsed = Number(trimmed);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 31) return null;
  return parsed;
}

export function toSettingsInput(
  values: SettingsFormValues,
): UpdateSettingsInput {
  const familyFundingTargetMinor = parseMadAmount(values.targetMad);
  if (familyFundingTargetMinor === null || familyFundingTargetMinor <= 0) {
    throw new Error("Invalid family funding target");
  }
  return {
    familyFundingTargetMinor,
    pendingContributionExpiryHours: values.pendingContributionExpiryHours,
    formFillEnabled: values.formFillEnabled,
    defaultMaxOrdersPerMonth: parseOptionalCountInput(
      values.defaultMaxOrders ?? "",
    ),
    defaultMaxBudgetPerOrderMinor: parseOptionalMadInput(
      values.defaultMaxPerOrderMad ?? "",
    ),
    defaultMonthlyBudgetMinor: parseOptionalMadInput(
      values.defaultMonthlyMad ?? "",
    ),
  };
}

export function settingsFormDefault(
  setting: {
    familyFundingTargetMinor: number;
    pendingContributionExpiryHours?: number;
    formFillEnabled: boolean;
    defaultMaxOrdersPerMonth?: number | null;
    defaultMaxBudgetPerOrderMinor?: number | null;
    defaultMonthlyBudgetMinor?: number | null;
  },
  timeZone?: string,
) {
  return {
    targetMad: minorUnitsToMadInput(setting.familyFundingTargetMinor),
    pendingContributionExpiryHours:
      setting.pendingContributionExpiryHours ?? 72,
    formFillEnabled: setting.formFillEnabled,
    defaultMaxOrders:
      setting.defaultMaxOrdersPerMonth == null
        ? ""
        : String(setting.defaultMaxOrdersPerMonth),
    defaultMaxPerOrderMad:
      setting.defaultMaxBudgetPerOrderMinor == null
        ? ""
        : minorUnitsToMadInput(setting.defaultMaxBudgetPerOrderMinor),
    defaultMonthlyMad:
      setting.defaultMonthlyBudgetMinor == null
        ? ""
        : minorUnitsToMadInput(setting.defaultMonthlyBudgetMinor),
    ...(timeZone ? { timeZone } : {}),
  };
}

export function evenSplitHint(
  monthlyMinor: number | null,
  count: number | null,
): { quotientMinor: number; remainderMinor: number } | null {
  if (monthlyMinor == null || count == null || count <= 0) return null;
  const quotientMinor = Math.floor(monthlyMinor / count);
  const remainderMinor = monthlyMinor - quotientMinor * count;
  return { quotientMinor, remainderMinor };
}