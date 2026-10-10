import {
  auth,
  CanCreate,
  CanDelete,
  CanList,
  CanRead,
  CanUpdate,
  defineRoles,
  own,
  Policy,
} from "najm-auth";
import { readFileSync } from "node:fs";

import { kafilTheme } from "@kafil/server/theme";
import { envConfig } from "./envConfig";

// `own(table, { name, adminRoles })` names the token after its resource, so
// the permissions are read:<name>, update:<name>, ...
export {
  auth,
  CanCreate,
  CanDelete,
  CanList,
  CanRead,
  CanUpdate,
  own,
  Policy,
};

function oauthConfig() {
  const google = process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
    ? {
      // Kafil domain profiles are created by the app onboarding workflows.
      // OAuth may link an active account, but must not create a bare auth user.
      allowSignup: false,
      autoLinkVerifiedEmail: true,
    } as const
    : undefined;
  const github = process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET
    ? {
      allowSignup: false,
      autoLinkVerifiedEmail: true,
    } as const
    : undefined;

  if (!google && !github) return undefined;
  return {
    google,
    github,
  } as const;
}

const authLogo = kafilTheme.asset("authLogo");
if (!authLogo) {
  throw new Error("Kafil factory theme must define the authLogo asset.");
}

const accountInviteLogo = Object.freeze({
  alt: "Kafil",
  contentBase64: readFileSync(authLogo.sourcePath).toString("base64"),
  contentType: authLogo.mimeType,
  filename: authLogo.fileName,
});

// Cache, rate limiting and email are registered before `authConfig()` in
// `server.ts` (cacheConfig, rateLimitConfig, emailConfig), so auth uses those
// plugins; config passed here for them would be ignored.
export const authConfig = () =>
  auth({
    appName: "Kafil",
    accountInviteLogo,
    defaultRole: "sponsor",
    dialect: "pg",
    encryptionKey: envConfig.auth.encryptionKey,
    frontendUrl: envConfig.auth.frontendUrl,
    oauth: oauthConfig(),
    publicRegistration: false,
    registrationMode: "pending",
    requireVerifiedEmail: true,
    jwt: {
      accessSecret: envConfig.auth.jwtAccessSecret!,
      refreshSecret: envConfig.auth.jwtRefreshSecret!,
    },
  });

/**
 * Kafil's roles and route guards. Each guard admits exactly the roles it lists:
 * admin is named wherever it may pass, and is deliberately absent from the
 * delivery guard, which protects commands only a delivery staff account owns.
 * A guard requires a signed-in, active principal (najm-auth's isAuth) and
 * compares roles case-insensitively.
 */
const { ROLES, createGroupGuard } = defineRoles({
  ADMIN: "admin",
  OPERATOR: "operator",
  DELIVERY: "delivery",
  FAMILY: "family",
  SPONSOR: "sponsor",
} as const);

export { ROLES };

type RoleKey = keyof typeof ROLES;
type RoleValue = (typeof ROLES)[RoleKey];

export const isAdmin = createGroupGuard(["ADMIN"]);
export const isOperator = createGroupGuard(["OPERATOR", "ADMIN"]);
export const isDeliveryStaff = createGroupGuard(["DELIVERY"]);
export const isFamily = createGroupGuard(["FAMILY", "ADMIN"]);
export const isSponsor = createGroupGuard(["SPONSOR", "ADMIN"]);
export const isNotificationReader = createGroupGuard(["ADMIN", "OPERATOR", "FAMILY", "SPONSOR", "DELIVERY"]);
export const isContributionReader = createGroupGuard(["ADMIN", "OPERATOR", "SPONSOR"]);
export const isChildReader = createGroupGuard(["ADMIN", "OPERATOR", "FAMILY"]);
export const isOrderReader = createGroupGuard(["ADMIN", "OPERATOR", "FAMILY", "SPONSOR"]);
export const isSponsorImageViewer = createGroupGuard(["OPERATOR", "SPONSOR", "ADMIN"]);
export const isSponsorImageManager = createGroupGuard(["OPERATOR", "SPONSOR", "ADMIN"]);
export const isChildImageViewer = createGroupGuard(["OPERATOR", "FAMILY", "SPONSOR", "ADMIN"]);

/**
 * Service-layer role checks. Unlike the guards, admin passes every check here:
 * it is Kafil's super role for domain decisions.
 */
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
