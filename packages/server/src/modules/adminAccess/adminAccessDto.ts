import { z } from "zod";

export const accessUserIdParams = z.object({
  userId: z.string().trim().min(1).max(120),
});

export const accessRoleIdParams = z.object({
  roleId: z.string().trim().min(1).max(120),
});

export const accessUserListQuery = z.object({
  search: z.string().trim().max(200).optional(),
  role: z.enum(["admin", "operator", "family", "sponsor"]).optional(),
  status: z.enum(["active", "inactive", "pending"]).optional(),
  verified: z.coerce.boolean().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  offset: z.coerce.number().int().min(0).default(0),
});

export const accessReasonDto = z.object({
  reason: z.string().trim().min(3).max(500),
});

const permissionSegment = z
  .string()
  .trim()
  .min(1)
  .max(80)
  .regex(
    /^[a-z][a-zA-Z0-9-]*$/,
    "Use letters, numbers, and hyphens, starting with a lowercase letter",
  );

export const createAccessPermissionDto = z.object({
  action: permissionSegment,
  resource: permissionSegment,
  description: z.string().trim().max(500).optional(),
  roles: z
    .array(z.enum(["admin", "operator", "family", "sponsor"]))
    .max(4)
    .default([]),
});

export type AccessUserListQuery = z.input<typeof accessUserListQuery>;
export type AccessReasonDto = z.input<typeof accessReasonDto>;
export type CreateAccessPermissionDto = z.input<
  typeof createAccessPermissionDto
>;
