import { z } from "zod";

import type {
  CreateAccessPermissionInput,
} from "../types";

const optionalText = (maximum: number) =>
  z.string().trim().max(maximum).optional();

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

export type CreateAccessPermissionValues = z.infer<
  typeof createAccessPermissionSchema
>;

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
