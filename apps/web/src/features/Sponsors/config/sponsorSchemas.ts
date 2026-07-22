import { z } from "zod";

import type {
  CreateSponsorInput,
  SponsorProfileInput,
  UpdateSponsorInput,
} from "../types";

const optionalText = (maximum: number) =>
  z.string().trim().max(maximum).optional();

const requiredProfileFields = {
  phone: z.string().trim().min(1, "Enter a phone number").max(40),
  cin: z.string().trim().min(8, "Enter a valid CIN").max(20),
  gender: z.enum(["M", "F"]),
  address: z.string().trim().min(1, "Enter an address").max(500),
  dateOfBirth: z.iso.date("Enter a valid date of birth"),
  notes: optionalText(2_000),
};

export const createSponsorFormSchema = z.object({
  name: z.string().trim().min(2, "Enter the sponsor's name").max(200),
  email: z.email("Enter a valid email address"),
  ...requiredProfileFields,
});

export const updateSponsorFormSchema = z.object({
  name: z.string().trim().min(2, "Enter the sponsor's name").max(200),
  email: z.email("Enter a valid email address"),
  phone: optionalText(40),
  cin: optionalText(20),
  gender: z.enum(["M", "F"]).optional(),
  address: optionalText(500),
  dateOfBirth: z.union([z.literal(""), z.iso.date("Enter a valid date of birth")]),
  notes: optionalText(2_000),
});

export const sponsorStatusFormSchema = z.object({
  reason: z.string().trim().min(3, "Give a short reason").max(500),
});

export type CreateSponsorFormValues = z.infer<typeof createSponsorFormSchema>;
export type UpdateSponsorFormValues = z.infer<typeof updateSponsorFormSchema>;
export type SponsorStatusFormValues = z.infer<typeof sponsorStatusFormSchema>;

function nullable(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function optional(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

function toProfileInput(values: CreateSponsorFormValues): SponsorProfileInput {
  return {
    phone: values.phone.trim(),
    cin: values.cin.trim().toUpperCase(),
    gender: values.gender,
    address: values.address.trim(),
    dateOfBirth: values.dateOfBirth,
    notes: nullable(values.notes),
  };
}

export function toCreateSponsorInput(
  values: CreateSponsorFormValues,
): CreateSponsorInput {
  return {
    name: values.name.trim(),
    email: values.email.trim(),
    ...toProfileInput(values),
  };
}

export function toUpdateSponsorInput(
  values: UpdateSponsorFormValues,
): UpdateSponsorInput {
  const phone = optional(values.phone);
  const cin = optional(values.cin);
  const address = optional(values.address);
  const dateOfBirth = values.dateOfBirth || undefined;

  return {
    name: values.name.trim(),
    email: values.email.trim(),
    ...(phone ? { phone } : {}),
    ...(cin ? { cin: cin.toUpperCase() } : {}),
    ...(values.gender ? { gender: values.gender } : {}),
    ...(address ? { address } : {}),
    ...(dateOfBirth ? { dateOfBirth } : {}),
    notes: nullable(values.notes),
  };
}
