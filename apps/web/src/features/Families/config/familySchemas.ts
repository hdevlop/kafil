import { localDateInput } from "najm-kit/format";
import { z } from "zod";

import { parseMadAmount } from "@/features/Budgets/config/budgetSchemas";

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

const optionalMadAmountInput = z
  .string()
  .trim()
  .refine((value) => {
    // F8 form-fill generates "Test <field>" placeholders for unknown strings;
    // treat them as empty (inherit global) so dev fills stay schema-valid.
    if (value === "" || value.startsWith("Test ")) return true;
    const minor = parseMadAmount(value);
    return minor !== null && minor > 0 && Number.isSafeInteger(minor);
  }, "Enter a positive MAD amount or leave empty for the global default");

const optionalOrderCountInput = z
  .string()
  .trim()
  .refine((value) => {
    if (value === "" || value.startsWith("Test ")) return true;
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed >= 1 && parsed <= 31;
  }, "Enter 1 to 31 or leave empty for the global default");

const deliveryLocationSchema = z
  .object({
    address: z
      .string()
      .trim()
      .min(5, "Enter the family's exact address")
      .max(1_000),
    latitude: z.number().finite().min(-90).max(90).nullable(),
    longitude: z.number().finite().min(-180).max(180).nullable(),
  })
  .superRefine((value, context) => {
    if ((value.latitude === null) !== (value.longitude === null)) {
      context.addIssue({
        code: "custom",
        message: "Latitude and longitude must be provided together",
        path: [value.latitude === null ? "latitude" : "longitude"],
      });
    }
  });

const householdFieldsShape = {
  housingSituation: z.enum(FAMILY_HOUSING_SITUATIONS),
  registrationDate,
  supportPriority: z.enum(FAMILY_SUPPORT_PRIORITIES),
  activationTargetMad: positiveMadAmount,
  maxOrdersPerMonthInput: optionalOrderCountInput.default(""),
  maxBudgetPerOrderMadInput: optionalMadAmountInput.default(""),
  monthlyBudgetMadInput: optionalMadAmountInput.default(""),
  notes: optionalText(2_000),
  deliveryLocation: deliveryLocationSchema,
};

const householdFieldsSchema = z.object(householdFieldsShape);

const updateHouseholdFieldsBaseShape = {
  ...householdFieldsShape,
  housingSituation: z.enum(FAMILY_STORED_HOUSING_SITUATIONS),
};

const {
  maxOrdersPerMonthInput: _omittedMaxOrdersPerMonthInput,
  maxBudgetPerOrderMadInput: _omittedMaxBudgetPerOrderMadInput,
  monthlyBudgetMadInput: _omittedMonthlyBudgetMadInput,
  ...updateHouseholdNoPolicyShape
} = updateHouseholdFieldsBaseShape;

export const updateFamilyHouseholdStepSchema = z
  .object(updateHouseholdNoPolicyShape);

export const createFamilyGuardianStepSchema = guardianFieldsSchema;
export const createFamilyHouseholdStepSchema = householdFieldsSchema;
export const createFamilyChildrenStepSchema = z.object({
  initialChildren: z.array(initialChildSchema).max(20),
});

export const createFamilyFormSchema = guardianFieldsSchema
  .extend(householdFieldsSchema.shape)
  .extend(createFamilyChildrenStepSchema.shape);

export const updateFamilyFormSchema = guardianFieldsSchema
  .extend(updateHouseholdNoPolicyShape);

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

function parseOptionalCount(value: string | undefined): number | null {
  const trimmed = (value ?? "").trim();
  if (trimmed === "" || trimmed.startsWith("Test ")) return null;
  const parsed = Number(trimmed);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 31) return null;
  return parsed;
}

function parseOptionalMad(value: string | undefined): number | null {
  const trimmed = (value ?? "").trim();
  if (trimmed === "" || trimmed.startsWith("Test ")) return null;
  const minor = parseMadAmount(trimmed);
  if (minor === null || minor <= 0) return null;
  return minor;
}

export function toCreateFamilyInput(
  values: CreateFamilyFormValues,
): CreateFamilyInput {
  const fundingTargetMinor = parseMadAmount(values.activationTargetMad);
  if (fundingTargetMinor === null || fundingTargetMinor <= 0) {
    throw new Error("Invalid family funding target");
  }

  const maxOrdersPerMonth = parseOptionalCount(
    (values as { maxOrdersPerMonthInput?: string }).maxOrdersPerMonthInput,
  );
  const maxBudgetPerOrderMinor = parseOptionalMad(
    (values as { maxBudgetPerOrderMadInput?: string }).maxBudgetPerOrderMadInput,
  );
  const monthlyBudgetMinor = parseOptionalMad(
    (values as { monthlyBudgetMadInput?: string }).monthlyBudgetMadInput,
  );

  return {
    name: values.name.trim(),
    email: values.email.trim(),
    guardianCin: values.guardianCin,
    guardianDateOfBirth: values.guardianDateOfBirth,
    exactAddress: values.deliveryLocation.address.trim(),
    deliveryLatitude: values.deliveryLocation.latitude,
    deliveryLongitude: values.deliveryLocation.longitude,
    housingSituation: values.housingSituation,
    registrationDate: values.registrationDate,
    supportPriority: values.supportPriority,
    phone: values.phone.trim(),
    fundingTargetMinor,
    ...(maxOrdersPerMonth !== null ? { maxOrdersPerMonth } : {}),
    ...(maxBudgetPerOrderMinor !== null ? { maxBudgetPerOrderMinor } : {}),
    ...(monthlyBudgetMinor !== null ? { monthlyBudgetMinor } : {}),
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
    exactAddress: values.deliveryLocation.address.trim(),
    deliveryLatitude: values.deliveryLocation.latitude,
    deliveryLongitude: values.deliveryLocation.longitude,
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
