import { z } from "zod";

import type { ChildFieldsInput, CreateChildInput, UpdateChildInput } from "../types";

const optionalText = (maximum: number) =>
  z.string().trim().max(maximum).optional();

const childFields = {
  legalName: z.string().trim().min(2, "Enter the child's legal name").max(200),
  dateOfBirth: z.iso.date("Enter a valid date of birth"),
  gender: z.enum(["M", "F"]),
  schoolLevel: optionalText(120),
  clothingSize: optionalText(40),
  shoeSize: optionalText(40),
  notes: optionalText(2_000),
};

export const createChildFormSchema = z.object({
  familyProfileId: z.uuid("Choose the child's family"),
  ...childFields,
});

export const updateChildFormSchema = z.object(childFields);

export const childStatusFormSchema = z.object({
  reason: z.string().trim().min(3, "Give a short reason").max(500),
});

export type CreateChildFormValues = z.infer<typeof createChildFormSchema>;
export type UpdateChildFormValues = z.infer<typeof updateChildFormSchema>;
export type ChildStatusFormValues = z.infer<typeof childStatusFormSchema>;

function nullable(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function toChildFieldsInput(
  values: Omit<ChildFieldsInput, "schoolLevel" | "clothingSize" | "shoeSize" | "notes"> & {
    schoolLevel?: string;
    clothingSize?: string;
    shoeSize?: string;
    notes?: string;
  },
): ChildFieldsInput {
  return {
    legalName: values.legalName.trim(),
    dateOfBirth: values.dateOfBirth,
    gender: values.gender,
    schoolLevel: nullable(values.schoolLevel),
    clothingSize: nullable(values.clothingSize),
    shoeSize: nullable(values.shoeSize),
    notes: nullable(values.notes),
  };
}

export function toCreateChildInput(
  values: CreateChildFormValues,
): CreateChildInput {
  return {
    familyProfileId: values.familyProfileId,
    ...toChildFieldsInput(values),
  };
}

export function toUpdateChildInput(
  values: UpdateChildFormValues,
): UpdateChildInput {
  return toChildFieldsInput(values);
}
