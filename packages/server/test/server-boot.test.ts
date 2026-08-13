import { describe, expect, it } from "bun:test";

import { server } from "../src";
import { FundingService } from "../src/modules/settings";
import { SettingService } from "../src/modules/settings/settingService";

describe("Kafil server boot", () => {
  it("resolves SettingService from the container after server.init()", async () => {
    await server.init();
    const settingService = server.container.get(SettingService);
    expect(settingService).toBeInstanceOf(SettingService);
  });

  it("resolves FundingService from the container after server.init()", async () => {
    await server.init();
    const fundingService = server.container.get(FundingService);
    expect(fundingService).toBeInstanceOf(FundingService);
  });

  it("registers exact managed-image routes before the generic storage wildcard", async () => {
    await server.init();
    const routes = server.app.routes.map((route) => `${route.method} ${route.path}`);
    const productRoute = routes.indexOf(
      "GET /api/product-images/files/serve/:fileName",
    );
    const storageWildcard = routes.indexOf("GET /api/:namespace/files/serve/*");

    expect(productRoute).toBeGreaterThanOrEqual(0);
    expect(storageWildcard).toBeGreaterThanOrEqual(0);
    expect(productRoute).toBeLessThan(storageWildcard);
  });
});
