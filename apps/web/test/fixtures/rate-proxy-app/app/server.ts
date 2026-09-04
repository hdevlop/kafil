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
