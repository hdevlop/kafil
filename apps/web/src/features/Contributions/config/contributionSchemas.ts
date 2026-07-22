import { z } from "zod";

import { parseMadAmount } from "@/features/Budgets/config/budgetSchemas";

import type {
  ContributionReasonInput,
  RecordContributionInput,
} from "../types";

const positiveMadAmount = z
  .string()
  .trim()
  .refine((value) => {
    const amountMinor = parseMadAmount(value);
    return amountMinor !== null && amountMinor > 0;
  }, "Enter a positive MAD amount with up to two decimals");

export function currentContributionDate(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export const recordContributionFormSchema = z.object({
  supportAssignmentId: z.string().uuid("Choose a sponsor and supported family"),
  amountMad: positiveMadAmount,
  paymentMethod: z.enum([
    "cash",
    "bank_transfer",
    "cheque",
    "mobile_transfer",
    "other",
  ]),
  paidOn: z.iso.date().refine(
    (value) => value <= currentContributionDate(),
    "Payment date cannot be in the future",
  ),
  externalReference: z.string().trim().max(160).optional(),
});

export const contributionReasonFormSchema = z.object({
  reason: z.string().trim().min(3, "Give a short reason").max(500),
});

export type ContributionReasonFormValues = z.infer<
  typeof contributionReasonFormSchema
>;
export type RecordContributionFormValues = z.infer<
  typeof recordContributionFormSchema
>;

export function toRecordContributionInput(
  values: RecordContributionFormValues,
): RecordContributionInput {
  const amountMinor = parseMadAmount(values.amountMad);
  if (amountMinor === null || amountMinor <= 0) {
    throw new Error("Invalid contribution amount");
  }

  return {
    supportAssignmentId: values.supportAssignmentId,
    amountMinor,
    paymentMethod: values.paymentMethod,
    paidAt: values.paidOn,
    ...(values.externalReference
      ? { externalReference: values.externalReference }
      : {}),
  };
}

export function toContributionReasonInput(
  id: string,
  values: ContributionReasonFormValues,
): ContributionReasonInput {
  return { id, reason: values.reason };
}
