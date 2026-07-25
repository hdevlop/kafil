import { z } from "zod";

import {
  minorUnitsToMadInput,
  parseMadAmount,
} from "@/features/Budgets/config/budgetSchemas";

import type {
  UpdateFormFillSettingInput,
  UpdateFundingSettingInput,
} from "../types";

export const fundingSettingFormSchema = z.object({
  targetMad: z
    .string()
    .trim()
    .refine((value) => {
      const minor = parseMadAmount(value);
      return minor !== null && minor > 0;
    }, "Enter a positive MAD amount with up to two decimals"),
  reason: z.string().trim().min(3, "Give a short reason").max(500),
});

export type FundingSettingFormValues = z.infer<
  typeof fundingSettingFormSchema
>;

export function toFundingSettingInput(
  values: FundingSettingFormValues,
): UpdateFundingSettingInput {
  const familyFundingTargetMinor = parseMadAmount(values.targetMad);
  if (familyFundingTargetMinor === null || familyFundingTargetMinor <= 0) {
    throw new Error("Invalid family funding target");
  }
  return { familyFundingTargetMinor, reason: values.reason };
}

export function fundingTargetDefaultValue(targetMinor: number) {
  return minorUnitsToMadInput(targetMinor);
}

export const formFillSettingFormSchema = z.object({
  enabled: z.boolean(),
  reason: z.string().trim().min(3, "Give a short reason").max(500),
});

export type FormFillSettingFormValues = z.infer<
  typeof formFillSettingFormSchema
>;

export function toFormFillSettingInput(
  values: FormFillSettingFormValues,
): UpdateFormFillSettingInput {
  return {
    enabled: values.enabled,
    reason: values.reason,
  };
}
