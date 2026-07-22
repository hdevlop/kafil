import { z } from "zod";

import type {
  CreateOwnSponsorProfileInput,
  UpdateOwnSponsorProfileInput,
} from "../types";

const requiredProfileFields = {
  phone: z.string().trim().min(1, "Enter a phone number").max(40),
  cin: z.string().trim().min(8, "Enter a valid CIN").max(20),
  gender: z.enum(["M", "F"]),
  address: z.string().trim().min(1, "Enter an address").max(500),
  dateOfBirth: z.iso.date("Enter a valid date of birth"),
};

export const createOwnSponsorProfileFormSchema = z.object(
  requiredProfileFields,
);

export const updateOwnSponsorProfileFormSchema = z.object({
  phone: z.string().trim().max(40).optional(),
  cin: z.string().trim().max(20).optional(),
  gender: z.enum(["M", "F"]).optional(),
  address: z.string().trim().max(500).optional(),
  dateOfBirth: z.union([z.literal(""), z.iso.date("Enter a valid date of birth")]),
});

export type CreateOwnSponsorProfileFormValues = z.infer<
  typeof createOwnSponsorProfileFormSchema
>;
export type UpdateOwnSponsorProfileFormValues = z.infer<
  typeof updateOwnSponsorProfileFormSchema
>;

function optional(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

export function toCreateOwnSponsorProfileInput(
  values: CreateOwnSponsorProfileFormValues,
): CreateOwnSponsorProfileInput {
  return {
    phone: values.phone.trim(),
    cin: values.cin.trim().toUpperCase(),
    gender: values.gender,
    address: values.address.trim(),
    dateOfBirth: values.dateOfBirth,
  };
}

export function toUpdateOwnSponsorProfileInput(
  values: UpdateOwnSponsorProfileFormValues,
): UpdateOwnSponsorProfileInput {
  const phone = optional(values.phone);
  const cin = optional(values.cin);
  const address = optional(values.address);
  const dateOfBirth = values.dateOfBirth || undefined;

  return {
    ...(phone ? { phone } : {}),
    ...(cin ? { cin: cin.toUpperCase() } : {}),
    ...(values.gender ? { gender: values.gender } : {}),
    ...(address ? { address } : {}),
    ...(dateOfBirth ? { dateOfBirth } : {}),
  };
}
