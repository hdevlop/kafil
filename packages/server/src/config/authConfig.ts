import {
  auth,
  CanCreate,
  CanDelete,
  CanList,
  CanRead,
  CanUpdate,
  defineRoles,
  type OwnershipTokenOptions,
  own,
  type OwnershipToken,
  Policy,
} from "najm-auth";

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

export const {
  ROLES,
  createGroupGuard,
  hasRole,
  isInGroup,
  isAdmin,
  isOperator,
  isFamily,
  isSponsor,
} = defineRoles(
  {
    ADMIN: "admin",
    OPERATOR: "operator",
    FAMILY: "family",
    SPONSOR: "sponsor",
  },
  {
    superRoles: ["ADMIN"],
  },
);

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
