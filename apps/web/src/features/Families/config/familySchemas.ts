import { z } from "zod";

import { parseMadAmount } from "@/features/Budgets/config/budgetSchemas";
import { localDateInput } from "@/lib/date";

import {
  FAMILY_HOUSING_SITUATIONS,
  FAMILY_STORED_HOUSING_SITUATIONS,
  FAMILY_SUPPORT_PRIORITIES,
  type CreateFamilyInput,
  type InitialChildInput,
  type UpdateFamilyInput,
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

const registrationDate = z.iso
  .date("Enter a valid registration date")
  .refine((value) => value <= localDateInput(), "Registration date cannot be in the future");

const initialChildSchema = z.object({
  legalName: z.string().trim().min(2, "Enter the child's legal name").max(200),
  dateOfBirth: z.iso.date("Enter a valid date of birth"),
  gender: z.enum(["M", "F"]),
  schoolLevel: optionalText(120),
  clothingSize: optionalText(40),
  shoeSize: optionalText(40),
  notes: optionalText(2_000),
});

const guardianFieldsSchema = z.object({
  name: z.string().trim().min(2, "Enter the account holder's name").max(200),
  email: z.email("Enter a valid email address"),
  guardianCin: z
    .string()
    .trim()
    .min(8, "Enter a valid CIN")
    .max(20)
    .toUpperCase(),
  guardianDateOfBirth: z.iso.date("Enter the guardian's date of birth"),
  relationshipToChildren: optionalText(120),
  phone: z.string().trim().min(1, "Enter a phone number").max(40),
});

const householdFieldsSchema = z.object({
  housingSituation: z.enum(FAMILY_HOUSING_SITUATIONS),
  registrationDate,
  supportPriority: z.enum(FAMILY_SUPPORT_PRIORITIES),
  activationTargetMad: positiveMadAmount,
  notes: optionalText(2_000),
  exactAddress: z
    .string()
    .trim()
    .min(5, "Enter the family's exact address")
    .max(1_000),
});

const updateHouseholdFieldsSchema = householdFieldsSchema.extend({
  housingSituation: z.enum(FAMILY_STORED_HOUSING_SITUATIONS),
});

export const createFamilyGuardianStepSchema = guardianFieldsSchema;
export const createFamilyHouseholdStepSchema = householdFieldsSchema;
export const createFamilyChildrenStepSchema = z.object({
  initialChildren: z.array(initialChildSchema).max(20),
});

export const createFamilyFormSchema = guardianFieldsSchema
  .extend(householdFieldsSchema.shape)
  .extend(createFamilyChildrenStepSchema.shape);

export const updateFamilyFormSchema = guardianFieldsSchema
  .extend(updateHouseholdFieldsSchema.shape);

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

  return {
    name: values.name.trim(),
    email: values.email.trim(),
    guardianCin: values.guardianCin,
    guardianDateOfBirth: values.guardianDateOfBirth,
    exactAddress: values.exactAddress.trim(),
    housingSituation: values.housingSituation,
    registrationDate: values.registrationDate,
    supportPriority: values.supportPriority,
    phone: values.phone.trim(),
    fundingTargetMinor,
    initialChildren: values.initialChildren.map(toInitialChild),
    relationshipToChildren: nullable(values.relationshipToChildren),
    notes: nullable(values.notes),
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
    ...(values.housingSituation === "unknown"
      ? {}
      : { housingSituation: values.housingSituation }),
    registrationDate: values.registrationDate,
    supportPriority: values.supportPriority,
    phone: nullable(values.phone),
    relationshipToChildren: nullable(values.relationshipToChildren),
    notes: nullable(values.notes),
    fundingTargetMinor,
  };
}
