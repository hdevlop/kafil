import type { SeedAuthDataConfig } from "najm-auth";

import {
  AUTH_PERMISSIONS as SERVER_AUTH_PERMISSIONS,
  AUTH_ROLES as SERVER_AUTH_ROLES,
  AUTH_ROLE_PERMISSIONS,
  type AuthRoleName,
  type PermissionName,
} from "@kafil/server/config";

export type { AuthRoleName, PermissionName };
export { AUTH_ROLE_PERMISSIONS };

export const AUTH_ROLES =
  SERVER_AUTH_ROLES.map((role) => ({ ...role })) satisfies NonNullable<
    SeedAuthDataConfig["roles"]
  >;
export const AUTH_PERMISSIONS =
  SERVER_AUTH_PERMISSIONS.map((permission) => ({
    ...permission,
  })) satisfies NonNullable<
    SeedAuthDataConfig["permissions"]
  >;
