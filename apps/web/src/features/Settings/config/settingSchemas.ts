import { z } from "zod";

import {
  minorUnitsToMadInput,
  parseMadAmount,
} from "@/features/Budgets/config/budgetSchemas";

import type { UpdateSettingsInput } from "../types";

export const MIN_PENDING_CONTRIBUTION_EXPIRY_HOURS = 1;
export const MAX_PENDING_CONTRIBUTION_EXPIRY_HOURS = 720;

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
});

export type SettingsFormValues = z.infer<typeof settingsFormSchema>;

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
  };
}

export function settingsFormDefault(
  setting: {
    familyFundingTargetMinor: number;
    pendingContributionExpiryHours?: number;
    formFillEnabled: boolean;
  },
  timeZone?: string,
) {
  return {
    targetMad: minorUnitsToMadInput(setting.familyFundingTargetMinor),
    pendingContributionExpiryHours:
      setting.pendingContributionExpiryHours ?? 72,
    formFillEnabled: setting.formFillEnabled,
    ...(timeZone ? { timeZone } : {}),
  };
}