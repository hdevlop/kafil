import { Controller, Get, RawResponse,
  ResMsg,
} from "najm-core";

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
}
