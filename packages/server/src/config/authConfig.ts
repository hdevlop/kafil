import {
  auth,
  CanCreate,
  CanDelete,
  CanList,
  CanRead,
  CanUpdate,
  TokenService,
  type OwnershipTokenOptions,
  own,
  type OwnershipToken,
  Policy,
} from "najm-auth";
import { GuardParams, Req, Service, User } from "najm-core";
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
interface KafilAuthPrincipal {
  id: string;
  role?: string | null;
  permissions?: string[];
}
interface KafilGuardRequest {
  header(name: string): string | undefined;
}
/**
 * Resolve the bearer token inside the guard when Najm's auth middleware has
 * not yet published its request context. Returning the principal also makes
 * it available to controller parameter decorators and subsequent guards.
 */
@Service()
export class KafilRoleGuard {
  constructor(private readonly tokens: TokenService) {}

  async canActivate(
    @GuardParams() params: KafilRoleGuardParams,
    @User() resolvedUser?: KafilAuthPrincipal,
    @Req() request?: KafilGuardRequest,
  ) {
    let user = resolvedUser;
    const authorization = request?.header("authorization");
    if (!user?.role && authorization) {
      try {
        user = (await this.tokens.getUser(authorization)) as KafilAuthPrincipal;
      } catch {
        return false;
      }
    }

    const userRole = user?.role?.toLowerCase();
    if (!user || !userRole) return false;
    if (!params.allowedRoles.some((role) => role === userRole)) return false;

    return {
      user,
      role: userRole,
      permissions: user.permissions ?? [],
    };
  }
}

const Role = createGuard<KafilRoleGuardParams>(KafilRoleGuard);

function roleGuard(keys: readonly RoleKey[]) {
  const allowed = Array.from(
    new Set([...keys.map((key) => ROLES[key]), ROLES.ADMIN]),
  );
  return composeGuards(Role({ allowedRoles: allowed }));
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
