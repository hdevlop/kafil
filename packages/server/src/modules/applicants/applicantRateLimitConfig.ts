import type { TimeWindow } from "najm-rate";

const DEFAULT_WINDOW: TimeWindow = "15m";

const defaultLimits = {
  registration: 5,
  verificationResend: 3,
  verificationConfirm: 5,
} as const;

const routeLimitEnv = {
  registration: "KAFIL_APPLICANT_REGISTRATION_RATE_LIMIT",
  verificationResend: "KAFIL_APPLICANT_VERIFICATION_REQUEST_RATE_LIMIT",
  verificationConfirm: "KAFIL_APPLICANT_VERIFICATION_CONFIRM_RATE_LIMIT",
} as const;

type ApplicantRateLimitName = keyof typeof defaultLimits;
type RateLimitEnvironment = Record<string, string | undefined>;

export interface ApplicantRateLimitOptions {
  limit: number;
  window: TimeWindow;
}
export type ApplicantRateLimitConfig = Record<
  ApplicantRateLimitName,
  ApplicantRateLimitOptions
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
  const raw = env.KAFIL_APPLICANT_RATE_WINDOW?.trim();
  if (!raw) return DEFAULT_WINDOW;
  if (!/^\d+[smhd]$/.test(raw) || raw.startsWith("0")) {
    throw new Error(
      "KAFIL_APPLICANT_RATE_WINDOW must be a positive duration such as 30s, 15m, 1h, or 1d",
    );
  }
  return raw as TimeWindow;
}

export function resolveApplicantRateLimitConfig(
  env: RateLimitEnvironment = process.env,
): ApplicantRateLimitConfig {
  const sharedLimit = optionalPositiveInteger(
    env,
    "KAFIL_APPLICANT_RATE_LIMIT",
  );
  const window = timeWindow(env);

  return Object.fromEntries(
    (Object.keys(defaultLimits) as ApplicantRateLimitName[]).map((name) => [
      name,
      {
        limit:
          optionalPositiveInteger(env, routeLimitEnv[name]) ??
          sharedLimit ??
          defaultLimits[name],
        window,
      },
    ]),
  ) as ApplicantRateLimitConfig;
}
