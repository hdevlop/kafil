import { envInt, isProduction } from "najm-core/env";
import { MAX_TRUSTED_PROXY_HOPS, rateLimit } from "najm-rate";

/**
 * Rate limits key on the client address, read from X-Forwarded-For through
 * this many trusted proxies. Too few and every client shares the proxy's
 * address; too many and a client can forge its own.
 *
 *   KAFIL_TRUSTED_PROXY_HOPS   0-8. Default 1 in production, 0 elsewhere.
 *
 * A direct local Next.js route handler exposes no socket peer, so with 0 hops
 * no request has a client address. In production such a request still counts
 * in one shared bucket; elsewhere it is not rate limited, rather than every
 * local request sharing one. Registered before `authConfig()`, which then
 * uses this plugin instead of building its own.
 */
export const rateLimitConfig = () =>
  rateLimit({
    trustedProxyHops: envInt("KAFIL_TRUSTED_PROXY_HOPS", process.env.KAFIL_TRUSTED_PROXY_HOPS, {
      fallback: isProduction() ? 1 : 0,
      max: MAX_TRUSTED_PROXY_HOPS,
    }),
    onUnresolvedClient: isProduction() ? "shared" : "skip",
  });
