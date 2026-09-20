import type { CustomRateLimitKey, TimeWindow } from "najm-rate";

const DEFAULT_LIMIT = 3;
const DEFAULT_WINDOW: TimeWindow = "15m";

type RateLimitEnvironment = Record<string, string | undefined>;

export interface AccessResetRateLimitOptions {
  limit: number;
  window: TimeWindow;
}

export function resolveAccessResetRateLimitConfig(
  env: RateLimitEnvironment = process.env,
): AccessResetRateLimitOptions {
  const raw = env.KAFIL_ACCESS_RESET_RATE_LIMIT?.trim();
  const limit = raw ? Number(raw) : DEFAULT_LIMIT;
  if (!Number.isSafeInteger(limit) || limit < 1) {
    throw new Error("KAFIL_ACCESS_RESET_RATE_LIMIT must be a positive safe integer");
  }

  const window = env.KAFIL_ACCESS_RESET_RATE_WINDOW?.trim();
  if (window && (!/^\d+[smhd]$/.test(window) || window.startsWith("0"))) {
    throw new Error(
      "KAFIL_ACCESS_RESET_RATE_WINDOW must be a positive duration such as 30s, 15m, 1h, or 1d",
    );
  }

  return { limit, window: (window as TimeWindow) ?? DEFAULT_WINDOW };
}

/**
 * One bucket per target account rather than per administrator. What the
 * cooldown protects is the target's mailbox and their single live link, so two
 * administrators on the same row — or one administrator clicking twice — share
 * it. Falls back to the caller's address only when the route somehow carries no
 * target, which the params schema already rejects.
 */
export const accessResetRateLimitKey: CustomRateLimitKey = (ctx, { clientIp }) => {
  const target = ctx.req.param("userId")?.trim();
  return target
    ? `admin-access:reset:user:${target}`
    : `admin-access:reset:ip:${clientIp}`;
};
