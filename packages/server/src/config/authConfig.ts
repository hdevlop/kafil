import {
  auth,
  CanCreate,
  CanDelete,
  CanList,
  CanRead,
  CanUpdate,
  isAuth,
  type OwnershipTokenOptions,
  own,
  type OwnershipToken,
  Policy,
} from "najm-auth";
import { GuardParams, Role as CurrentRole, Service } from "najm-core";
import { composeGuards, createGuard } from "najm-guard";

import { envConfig } from "./envConfig";

export {
  auth,
  CanCreate,
  CanDelete,
  CanList,
  CanRead,
  CanUpdate,
  Policy,
};

export const authConfig = () =>
  auth({
    defaultRole: "sponsor",
    dialect: "pg",
    encryptionKey: envConfig.auth.encryptionKey,
    frontendUrl: envConfig.auth.frontendUrl,
    registrationMode: "pending",
    jwt: {
      accessSecret: envConfig.auth.jwtAccessSecret!,
      refreshSecret: envConfig.auth.jwtRefreshSecret!,
    },
  });

export const ROLES = {
  ADMIN: "admin",
  OPERATOR: "operator",
  FAMILY: "family",
  SPONSOR: "sponsor",
} as const;

type RoleKey = keyof typeof ROLES;
type RoleValue = (typeof ROLES)[RoleKey];
interface KafilRoleGuardParams {
  allowedRoles: readonly RoleValue[];
}
/**
 * Najm's resolver publishes the canonical database role through its dedicated
 * guard ROLE context. The package's stock RoleGuard reads USER.role instead,
 * which is not populated consistently after refresh.
 */
@Service()
export class KafilRoleGuard {
  canActivate(
    @GuardParams() params: KafilRoleGuardParams,
    @CurrentRole() userRole?: string,
  ) {
    if (!userRole) return false;
    const normalized = userRole.toLowerCase();
    return params.allowedRoles.some((role) => role === normalized);
  }
}

const Role = createGuard<KafilRoleGuardParams>(KafilRoleGuard);

function roleGuard(keys: readonly RoleKey[]) {
  const allowed = Array.from(
    new Set([...keys.map((key) => ROLES[key]), ROLES.ADMIN]),
  );
  return composeGuards(isAuth(), Role({ allowedRoles: allowed }));
}

export const createGroupGuard = (keys: readonly RoleKey[]) => roleGuard(keys);
export const isAdmin = roleGuard(["ADMIN"]);
export const isOperator = roleGuard(["OPERATOR"]);
export const isFamily = roleGuard(["FAMILY"]);
export const isSponsor = roleGuard(["SPONSOR"]);

export function hasRole(userRole: string | null | undefined, ...keys: RoleKey[]) {
  if (!userRole) return false;
  const normalized = userRole.toLowerCase();
  return [...keys.map((key) => ROLES[key]), ROLES.ADMIN].includes(
    normalized as RoleValue,
  );
}

export const isInGroup = (
  userRole: string | null | undefined,
  keys: readonly RoleKey[],
) => hasRole(userRole, ...keys);

export const isSponsorImageViewer = createGroupGuard([
  "OPERATOR",
  "SPONSOR",
]);

export function definePolicy(
  table: unknown,
  resource: string,
  options?: OwnershipTokenOptions,
): OwnershipToken {
  const token = own(table, options);
  Object.defineProperty(token, "name", {
    configurable: false,
    enumerable: true,
    value: resource,
    writable: false,
  });
  return token;
}
