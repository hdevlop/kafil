import { Controller, Get, RawResponse,
  ResMsg,
} from "najm-core";

import { pool } from "../../config/databaseConfig";

type DatabaseProbe = () => Promise<unknown>;

export async function databaseReadinessResponse(
  probe: DatabaseProbe = () => pool.query("select 1"),
) {
  try {
    await probe();

    return Response.json(
      {
        checks: { database: "ok" },
        service: "kafil",
        status: "ready",
        version: "0.1.0",
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json(
      {
        checks: { database: "unavailable" },
        service: "kafil",
        status: "not_ready",
        version: "0.1.0",
      },
      {
        headers: { "Cache-Control": "no-store" },
        status: 503,
      },
    );
  }
}

@Controller("/system")
export class SystemController {
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
    return databaseReadinessResponse();
  }
}
