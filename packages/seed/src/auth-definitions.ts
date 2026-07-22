import type { SeedAuthDataConfig } from "najm-auth";

export type AuthRoleName = "admin" | "operator" | "family" | "sponsor";

export const AUTH_ROLES = [
  {
    name: "admin",
    description: "Bootstrap-only Najm administrator; not assigned to operators",
  },
  { name: "operator", description: "Kafil operator" },
  { name: "family", description: "Family account" },
  { name: "sponsor", description: "Sponsor account" },
] satisfies Array<{
  description: string;
  name: AuthRoleName;
}> &
  NonNullable<SeedAuthDataConfig["roles"]>;

export const AUTH_PERMISSIONS = [
  ...crudPermissions("operators", "operator profiles"),
  ...crudPermissions("sponsors", "sponsor profiles"),
  ...crudPermissions("families", "family profiles"),
  ...crudPermissions("children", "children"),
  ...writePermissions(
    "supportAssignments",
    "sponsor support assignments",
  ),
  ...writePermissions("contributions", "contribution workflows"),
  permission(
    "delete",
    "contributions",
    "Permanently delete incorrectly recorded contributions",
  ),
  permission("read", "budgets", "Read family budget summaries and ledgers"),
  permission("update", "budgets", "Set limits and apply budget adjustments"),
  permission("read", "settings", "Read platform product settings"),
  permission("update", "settings", "Update platform product settings"),
  permission("read", "audit-events", "Read filtered audit events"),
  permission("read", "documents", "Read protected family documents"),
  permission("create", "documents", "Create protected family documents"),
  permission("update", "documents", "Update protected family documents"),
  permission("delete", "documents", "Delete protected family documents"),
] satisfies NonNullable<SeedAuthDataConfig["permissions"]>;

export type PermissionName = (typeof AUTH_PERMISSIONS)[number]["name"];

export const AUTH_ROLE_PERMISSIONS: Record<
  AuthRoleName,
  readonly PermissionName[]
> = {
  admin: AUTH_PERMISSIONS.map(
    (permission) => permission.name,
  ) as PermissionName[],
  operator: [
    "read:sponsors",
    "create:sponsors",
    "update:sponsors",
    "delete:sponsors",
    "read:families",
    "create:families",
    "update:families",
    "read:children",
    "create:children",
    "update:children",
    "read:supportAssignments",
    "create:supportAssignments",
    "update:supportAssignments",
    "read:contributions",
    "create:contributions",
    "update:contributions",
    "read:budgets",
    "update:budgets",
    "read:settings",
    "update:settings",
    "read:audit-events",
    "read:documents",
    "create:documents",
    "update:documents",
    "delete:documents",
  ],
  family: ["read:families", "read:children", "read:budgets"],
  sponsor: [
    "read:sponsors",
    "create:sponsors",
    "update:sponsors",
    "read:supportAssignments",
    "create:supportAssignments",
    "read:contributions",
    "create:contributions",
    "update:contributions",
  ],
};

function crudPermissions(resource: string, label: string) {
  return [
    permission("read", resource, `Read ${label}`),
    permission("create", resource, `Create ${label}`),
    permission("update", resource, `Update ${label}`),
    permission("delete", resource, `Delete ${label}`),
  ] as const;
}

function writePermissions(resource: string, label: string) {
  return [
    permission("read", resource, `Read ${label}`),
    permission("create", resource, `Create ${label}`),
    permission("update", resource, `Update ${label}`),
  ] as const;
}

function permission(action: string, resource: string, description: string) {
  return {
    action,
    description,
    name: `${action}:${resource}`,
    resource,
  } as const;
}
