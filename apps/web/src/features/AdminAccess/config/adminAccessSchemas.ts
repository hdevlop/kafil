import { z } from "zod";

import type {
  CreateAccessOperatorInput,
  CreateAccessPermissionInput,
} from "../types";

const optionalText = (maximum: number) =>
  z.string().trim().max(maximum).optional();

export const createAccessOperatorSchema = z.object({
  name: z.string().trim().min(2).max(200),
  email: z.email(),
  phone: z.string().trim().min(1).max(40),
  cin: z.string().trim().min(8).max(20),
  gender: z.enum(["M", "F"]),
  address: z.string().trim().min(1).max(500),
  dateOfBirth: z.iso.date(),
  jobTitle: optionalText(120),
  notes: optionalText(2_000),
});

const permissionSegment = z
  .string()
  .trim()
  .min(1)
  .max(80)
  .regex(/^[a-z][a-zA-Z0-9-]*$/);

export const createAccessPermissionSchema = z.object({
  action: permissionSegment,
  resource: permissionSegment,
  description: optionalText(500),
  roles: z.array(z.enum(["admin", "operator", "family", "sponsor"])).max(4),
});

export type CreateAccessOperatorValues = z.infer<
  typeof createAccessOperatorSchema
>;
export type CreateAccessPermissionValues = z.infer<
  typeof createAccessPermissionSchema
>;

export function toCreateAccessOperatorInput(
  values: CreateAccessOperatorValues,
  image: string | null,
): CreateAccessOperatorInput {
  return {
    ...values,
    name: values.name.trim(),
    email: values.email.trim(),
    phone: values.phone.trim(),
    cin: values.cin.trim().toUpperCase(),
    address: values.address.trim(),
    jobTitle: values.jobTitle?.trim() || undefined,
    notes: values.notes?.trim() || undefined,
    image,
  };
}

export function toCreateAccessPermissionInput(
  values: CreateAccessPermissionValues,
): CreateAccessPermissionInput {
  return {
    ...values,
    action: values.action.trim(),
    resource: values.resource.trim(),
    description: values.description?.trim() || undefined,
  };
}
