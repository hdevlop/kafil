import { describe, expect, it } from "bun:test";

import {
  demoCountArgs,
  parseSeedCliArgs,
  seedCountValidation,
  seedCliHelp,
} from "../src/seed-cli";

describe("seed CLI", () => {
  it("opens the menu when no command is provided", () => {
    expect(parseSeedCliArgs([])).toEqual({
      command: undefined,
      help: false,
      passthrough: [],
      yes: false,
    });
  });

  it("parses direct commands, safety flags, and demo count options", () => {
    expect(
      parseSeedCliArgs(["--", "full", "--yes", "--families=7"]),
    ).toMatchObject({
      command: "full",
      passthrough: ["--families=7"],
      yes: true,
    });
    expect(
      parseSeedCliArgs(["demo", "--families=3", "-s", "4"]),
    ).toEqual({
      command: "demo",
      help: false,
      passthrough: ["--families=3", "-s", "4"],
      yes: false,
    });
    expect(parseSeedCliArgs(["reset"])).toMatchObject({ command: "setup" });
    expect(parseSeedCliArgs(["clean", "--yes"])).toMatchObject({
      command: "remove",
      yes: true,
    });
  });

  it("builds and validates all interactive demo count arguments", () => {
    expect(
      demoCountArgs({
        contributions: 40,
        deliveries: 4,
        families: 10,
        operators: 3,
        sponsors: 25,
      }),
    ).toEqual([
      "--families=10",
      "--sponsors=25",
      "--operators=3",
      "--deliveries=4",
      "--contributions=40",
    ]);
    expect(seedCountValidation("0")).toBeUndefined();
    expect(seedCountValidation("10000")).toBeUndefined();
    expect(seedCountValidation("1.5")).toContain("whole number");
    expect(seedCountValidation("10001")).toContain("whole number");
  });

  it("rejects unknown commands and options on fixed commands", () => {
    expect(() => parseSeedCliArgs(["unknown"])).toThrow("Unknown seed command");
    expect(() => parseSeedCliArgs(["verify", "extra"])).toThrow(
      "does not accept",
    );
  });

  it("documents every CLI command and the destructive flag", () => {
    const help = seedCliHelp();
    for (const command of [
      "setup",
      "demo",
      "remove",
      "full",
      "migrate",
      "admin",
      "categories",
      "verify",
      "images",
    ]) {
      expect(help).toContain(command);
    }
    expect(help).toContain("--yes");
    expect(help).toContain("products and empty categories");
    expect(help.split("\n").length).toBeLessThanOrEqual(30);
  });

  it("routes admin directly without reset, migration, or demo work", async () => {
    const cliSource = await Bun.file(
      new URL("../src/cli.ts", import.meta.url),
    ).text();
    const adminSource = await Bun.file(
      new URL("../src/scripts/seed-admin.ts", import.meta.url),
    ).text();

    expect(cliSource).toContain('admin: "src/scripts/seed-admin.ts"');
    for (const forbiddenCall of [
      "clearSeedData",
      "clearSeedStorage",
      "migrateDatabase",
      "seedDemoData",
    ]) {
      expect(adminSource).not.toContain(forbiddenCall);
    }
  });

  it("routes demo removal without the full reset", async () => {
    const cliSource = await Bun.file(
      new URL("../src/cli.ts", import.meta.url),
    ).text();
    const removeSource = await Bun.file(
      new URL("../src/scripts/remove-demo.ts", import.meta.url),
    ).text();

    expect(cliSource).toContain('remove: "src/scripts/remove-demo.ts"');
    expect(removeSource).toContain("removeDemoData");
    expect(removeSource).not.toContain("clearSeedData");
    expect(removeSource).not.toContain("clearSeedStorage");
  });

  it("seeds categories, products, and realistic historical orders during demo seeding", async () => {
    const [demoSeedSource, demoCommandSource] = await Promise.all([
      Bun.file(new URL("../src/demo-seed.ts", import.meta.url)).text(),
      Bun.file(
        new URL("../src/scripts/demo/seed-demo.ts", import.meta.url),
      ).text(),
    ]);

    expect(demoCommandSource).toContain("seedCatalogCategories");
    expect(demoCommandSource).toContain("seedDemoCatalogProducts");
    expect(demoCommandSource).toContain("seedDemoOrders");
    expect(demoCommandSource).toContain("OrderEvidenceService");
    expect(demoCommandSource).toContain("OrderService");
    expect(demoSeedSource).toContain('functions: ["delivery"]');
  });
});
