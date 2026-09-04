import "reflect-metadata";

import { cache } from "najm-cache";
import { Controller, Get, Server } from "najm-core";
import { rateLimit, RateLimit } from "najm-rate";

@Controller("/rate-probe")
class RateProxyAcceptanceController {
  @Get("/normal")
  @RateLimit({ limit: 2, window: "1m" })
  normal() {
    return { status: "ok" };
  }

  @Get("/malformed")
  @RateLimit({ limit: 2, window: "1m" })
  malformed() {
    return { status: "ok" };
  }

  @Get("/short")
  @RateLimit({ limit: 2, window: "1m" })
  short() {
    return { status: "ok" };
  }
}

export const rateProxyAcceptanceServer = new Server({ isolated: true })
  .use(cache({ driver: "memory" }))
  .use(rateLimit({ trustedProxyHops: 1 }))
  .base("/api")
  .load({ RateProxyAcceptanceController });

@Controller("/rate-probe")
class ZeroHopAcceptanceController {
  @Get("/peer")
  @RateLimit({ limit: 2, window: "1m" })
  peer() {
    return { status: "ok" };
  }
}

// Zero hops refuses forwarded headers outright. Next.js route handlers are
// handed a Request and never the connection, so no socket peer exists here at
// all and the resolver fails closed: every request shares one bounded bucket
// regardless of the chain or client address supplied. Coarse, but not
// attacker-partitionable, which is the property under test.
export const zeroHopAcceptanceServer = new Server({ isolated: true })
  .use(cache({ driver: "memory" }))
  .use(rateLimit({ trustedProxyHops: 0 }))
  .base("/zero")
  .load({ ZeroHopAcceptanceController });
