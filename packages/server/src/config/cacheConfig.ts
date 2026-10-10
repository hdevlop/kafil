import Redis from "ioredis";
import { cache, redisCacheConfig } from "najm-cache";
import { isProduction } from "najm-core/env";
import { isNextBuildPhase } from "najm-next/env";

/**
 * Redis in production, where sessions and rate limits must be shared across
 * instances; memory in development unless REDIS_URL is set, and always during
 * `next build`, which must not contact production services.
 *
 *   REDIS_URL   redis:// or rediss:// URL. Required, with a password, in production.
 *
 * ioredis is imported here rather than left to najm-cache's dynamic require,
 * so the Next server bundle includes it. Registered before `authConfig()`,
 * which then uses this cache instead of building its own.
 */
export const cacheConfig = () =>
  cache(redisCacheConfig({
    url: process.env.REDIS_URL,
    Redis,
    keyPrefix: "kafil:",
    required: isProduction(),
    buildPhase: isNextBuildPhase(),
  }));
