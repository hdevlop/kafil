import { resolve } from "node:path";

const MAX_TRUSTED_PROXY_HOPS = 8;

function redisUrl(value: string | undefined, production: boolean) {
  if (!value) return undefined;

  try {
    const parsed = new URL(value);
    if (
      !(["redis:", "rediss:"] as string[]).includes(parsed.protocol) ||
      !parsed.hostname ||
      (production && !parsed.password)
    ) {
      throw new Error("invalid Redis URL");
    }
  } catch {
    throw new Error("REDIS_URL must be a valid redis:// or rediss:// URL");
  }

  return value;
}

function trustedProxyHops(value: string | undefined, production: boolean) {
  if (value === undefined || value === "") return production ? 1 : 0;
  if (!/^\d+$/.test(value)) {
    throw new Error(
      `KAFIL_TRUSTED_PROXY_HOPS must be an integer from 0 to ${MAX_TRUSTED_PROXY_HOPS}`,
    );
  }

  const hops = Number(value);
  if (!Number.isSafeInteger(hops) || hops > MAX_TRUSTED_PROXY_HOPS) {
    throw new Error(
      `KAFIL_TRUSTED_PROXY_HOPS must be an integer from 0 to ${MAX_TRUSTED_PROXY_HOPS}`,
    );
  }

  return hops;
}

export const envConfig = {
  get databaseUrl() {
    return process.env.DATABASE_URL;
  },
  auth: {
    get cache() {
      const production = process.env.NODE_ENV === "production";
      const url = redisUrl(process.env.REDIS_URL, production);

      return {
        driver: production || url ? "redis" : "memory",
        keyPrefix: "kafil:",
        required: production,
        url,
      } as const;
    },
    get encryptionKey() {
      return process.env.NAJM_ENCRYPTION_KEY;
    },
    get frontendUrl() {
      return process.env.FRONTEND_URL;
    },
    get jwtAccessSecret() {
      return process.env.JWT_ACCESS_SECRET;
    },
    get jwtRefreshSecret() {
      return process.env.JWT_REFRESH_SECRET;
    },
    get trustedProxyHops() {
      return trustedProxyHops(
        process.env.KAFIL_TRUSTED_PROXY_HOPS,
        process.env.NODE_ENV === "production",
      );
    },
  },
  storage: {
    get basePath() {
      return resolve(
        /* turbopackIgnore: true */ process.cwd(),
        process.env.KAFIL_STORAGE_PATH ?? "../../storage",
      );
    },
  },
} as const;
