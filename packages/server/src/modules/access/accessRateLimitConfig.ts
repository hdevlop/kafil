import type { TimeWindow } from "najm-rate";

const DEFAULT_WINDOW: TimeWindow = "15m";

const defaultLimits = {
  login: 5,
  sponsorRegistration: 5,
  verificationResend: 3,
  verificationConfirm: 5,
  familyPasswordChange: 5,
} as const;

const routeLimitEnv = {
  login: "KAFIL_ACCESS_LOGIN_RATE_LIMIT",
  sponsorRegistration: "KAFIL_ACCESS_SPONSOR_REGISTRATION_RATE_LIMIT",
  verificationResend: "KAFIL_ACCESS_VERIFICATION_REQUEST_RATE_LIMIT",
  verificationConfirm: "KAFIL_ACCESS_VERIFICATION_CONFIRM_RATE_LIMIT",
  familyPasswordChange: "KAFIL_ACCESS_FAMILY_PASSWORD_RATE_LIMIT",
} as const;

type AccessRateLimitName = keyof typeof defaultLimits;
type RateLimitEnvironment = Record<string, string | undefined>;

export interface AccessRateLimitOptions {
  limit: number;
  window: TimeWindow;
}
export type AccessRateLimitConfig = Record<
  AccessRateLimitName,
  AccessRateLimitOptions
>;

function optionalPositiveInteger(
  env: RateLimitEnvironment,
  name: string,
): number | undefined {
  const raw = env[name]?.trim();
  if (!raw) return undefined;

  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new Error(`${name} must be a positive safe integer`);
  }
  return value;
}

function timeWindow(env: RateLimitEnvironment): TimeWindow {
  const raw = env.KAFIL_ACCESS_RATE_WINDOW?.trim();
  if (!raw) return DEFAULT_WINDOW;
  if (!/^\d+[smhd]$/.test(raw) || raw.startsWith("0")) {
    throw new Error(
      "KAFIL_ACCESS_RATE_WINDOW must be a positive duration such as 30s, 15m, 1h, or 1d",
    );
  }
  return raw as TimeWindow;
}

export function resolveAccessRateLimitConfig(
  env: RateLimitEnvironment = process.env,
): AccessRateLimitConfig {
  const sharedLimit = optionalPositiveInteger(
    env,
    "KAFIL_ACCESS_RATE_LIMIT",
  );
  const window = timeWindow(env);

  return Object.fromEntries(
    (Object.keys(defaultLimits) as AccessRateLimitName[]).map((name) => [
      name,
      {
        limit:
          optionalPositiveInteger(env, routeLimitEnv[name]) ??
          sharedLimit ??
          defaultLimits[name],
        window,
      },
    ]),
  ) as AccessRateLimitConfig;
}
