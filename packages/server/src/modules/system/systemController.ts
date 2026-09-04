import { CacheService } from "najm-cache";
import { Controller, Get, RawResponse, ResMsg } from "najm-core";

import { pool } from "../../config/databaseConfig";

type ReadinessProbe = () => Promise<unknown>;

export async function systemReadinessResponse(
  probes: {
    cache?: ReadinessProbe;
    database?: ReadinessProbe;
  } = {},
) {
  const [database, cache] = await Promise.allSettled([
    (probes.database ?? (() => pool.query("select 1")))(),
    (probes.cache ?? (async () => undefined))(),
  ]);
  const checks = {
    cache: cache.status === "fulfilled" ? "ok" : "unavailable",
    database: database.status === "fulfilled" ? "ok" : "unavailable",
  } as const;
  const ready = database.status === "fulfilled" && cache.status === "fulfilled";

  return Response.json(
    {
      checks,
      service: "kafil",
      status: ready ? "ready" : "not_ready",
      version: "0.1.0",
    },
    {
      headers: { "Cache-Control": "no-store" },
      status: ready ? 200 : 503,
    },
  );
}

@Controller("/system")
export class SystemController {
  constructor(private readonly cache: CacheService) {}

  @Get("/health")
  @RawResponse()
  @ResMsg("system.success.healthy")
  health() {
    return {
      service: "kafil",
      status: "ok",
      version: "0.1.0",
    } as const;
  }

  @Get("/readiness")
  @RawResponse()
  @ResMsg("system.success.healthy")
  readiness() {
    return systemReadinessResponse({ cache: () => this.cache.verifyReady() });
  }
}
