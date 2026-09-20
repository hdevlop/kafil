import { z } from "zod";

export const accessUserIdParams = z.object({
  userId: z.string().trim().min(1).max(120),
});

export const accessRoleIdParams = z.object({
  roleId: z.string().trim().min(1).max(120),
});

export const accessUserListQuery = z.object({
  search: z.string().trim().max(200).optional(),
  role: z
    .enum(["admin", "operator", "delivery", "family", "sponsor"])
    .optional(),
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
    .array(z.enum(["admin", "operator", "delivery", "family", "sponsor"]))
    .max(5)
    .default([]),
});

export type AccessUserListQuery = z.input<typeof accessUserListQuery>;
export type AccessReasonDto = z.input<typeof accessReasonDto>;
export type CreateAccessPermissionDto = z.input<
  typeof createAccessPermissionDto
>;

/**
 * The server picks the workflow from the account's current state; the client
 * sends only the target id and a reason, and reads the mode back. Keeping the
 * three outcomes on one discriminant is what stops a second "which reset?"
 * endpoint from appearing later.
 */
export const ACCESS_RESET_MODES = [
  "family_credential_setup",
  "reset_email_sent",
  "invitation_resent",
] as const;

export type AccessResetMode = (typeof ACCESS_RESET_MODES)[number];

/**
 * What the dialog told the administrator would happen, echoed back so the
 * command can check it. It selects nothing — the server still reloads the
 * account and decides — but a value that no longer matches means the copy the
 * administrator read named a different consequence, and the command refuses
 * rather than performing the one they never confirmed. A caller that claims
 * nothing is held to nothing.
 */
export const accessResetDto = accessReasonDto.extend({
  expectedMode: z.enum(ACCESS_RESET_MODES).optional(),
});

export type AccessResetDto = z.input<typeof accessResetDto>;

/**
 * `simulated` is the console/memory provider answering success for a message
 * nobody received. It is not `sent`, and the UI must not say it was.
 */
export const ACCESS_RESET_DELIVERIES = [
  "not_applicable",
  "sent",
  "simulated",
  "not_sent",
] as const;

export type AccessResetDelivery = (typeof ACCESS_RESET_DELIVERIES)[number];

export interface AccessResetResult {
  userId: string;
  mode: AccessResetMode;
  delivery: AccessResetDelivery;
}
