import { z } from "zod";

import { parseMadAmount } from "@/features/Budgets/config/budgetSchemas";

import type {
  CreateFamilyInput,
  InitialChildInput,
  UpdateFamilyInput,
} from "../types";

const optionalText = (maximum: number) =>
  z.string().trim().max(maximum).optional();

const positiveMadAmount = z
  .string()
  .trim()
  .refine((value) => {
    const minor = parseMadAmount(value);
    return minor !== null && minor > 0;
  }, "Enter a positive MAD amount with up to two decimals");

const initialChildSchema = z.object({
  legalName: z.string().trim().min(2, "Enter the child's legal name").max(200),
  dateOfBirth: z.iso.date("Enter a valid date of birth"),
  gender: z.enum(["M", "F"]),
  schoolLevel: optionalText(120),
  clothingSize: optionalText(40),
  shoeSize: optionalText(40),
  notes: optionalText(2_000),
});

const familyProfileFormSchema = z.object({
  name: z.string().trim().min(2, "Enter the account holder's name").max(200),
  email: z.email("Enter a valid email address"),
  guardianCin: z
    .string()
    .trim()
    .min(8, "Enter a valid CIN")
    .max(20)
    .toUpperCase(),
  guardianDateOfBirth: z.iso.date("Enter the guardian's date of birth"),
  exactAddress: z
    .string()
    .trim()
    .min(5, "Enter the family's exact address")
    .max(1_000),
  phone: z.string().trim().min(1, "Enter a phone number").max(40),
  activationTargetMad: positiveMadAmount,
  relationshipToChildren: optionalText(120),
  notes: optionalText(2_000),
});

export const createFamilyFormSchema = familyProfileFormSchema.extend({
  initialChildren: z.array(initialChildSchema).max(20),
});

export const updateFamilyFormSchema = familyProfileFormSchema;

export const familyStatusFormSchema = z.object({
  reason: z.string().trim().min(3, "Give a short reason").max(500),
});

export type CreateFamilyFormValues = z.infer<typeof createFamilyFormSchema>;
export type UpdateFamilyFormValues = z.infer<typeof updateFamilyFormSchema>;
export type FamilyStatusFormValues = z.infer<typeof familyStatusFormSchema>;

function nullable(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function toInitialChild(child: InitialChildInput): InitialChildInput {
  return {
    ...child,
    schoolLevel: nullable(child.schoolLevel ?? undefined),
    clothingSize: nullable(child.clothingSize ?? undefined),
    shoeSize: nullable(child.shoeSize ?? undefined),
    notes: nullable(child.notes ?? undefined),
  };
}

export function toCreateFamilyInput(
  values: CreateFamilyFormValues,
): CreateFamilyInput {
  const fundingTargetMinor = parseMadAmount(values.activationTargetMad);
  if (fundingTargetMinor === null || fundingTargetMinor <= 0) {
    throw new Error("Invalid family funding target");
  }

  const common = {
    name: values.name.trim(),
    email: values.email.trim(),
    initialChildren: values.initialChildren.map(toInitialChild),
    relationshipToChildren: nullable(values.relationshipToChildren),
    notes: nullable(values.notes),
    fundingTargetMinor,
  };

  return {
    ...common,
    guardianCin: values.guardianCin,
    guardianDateOfBirth: values.guardianDateOfBirth,
    exactAddress: values.exactAddress.trim(),
    phone: values.phone.trim(),
  };
}

export function maskGuardianCin(cin: string | null) {
  return cin ? `${cin.slice(0, 2)}****${cin.slice(-2)}` : "Not provided";
}

export function toUpdateFamilyInput(
  values: UpdateFamilyFormValues,
): UpdateFamilyInput {
  const fundingTargetMinor = parseMadAmount(values.activationTargetMad);
  if (fundingTargetMinor === null || fundingTargetMinor <= 0) {
    throw new Error("Invalid family funding target");
  }

  return {
    name: values.name.trim(),
    email: values.email.trim(),
    guardianCin: values.guardianCin,
    guardianDateOfBirth: values.guardianDateOfBirth,
    exactAddress: values.exactAddress.trim(),
    phone: nullable(values.phone),
    relationshipToChildren: nullable(values.relationshipToChildren),
    notes: nullable(values.notes),
    fundingTargetMinor,
  };
}
