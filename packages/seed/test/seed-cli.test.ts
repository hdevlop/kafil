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
  });

  it("builds and validates all interactive demo count arguments", () => {
    expect(
      demoCountArgs({
        contributions: 40,
        families: 10,
        operators: 3,
        sponsors: 25,
      }),
    ).toEqual([
      "--families=10",
      "--sponsors=25",
      "--operators=3",
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
      "full",
      "migrate",
      "admin",
      "verify",
      "images",
    ]) {
      expect(help).toContain(command);
    }
    expect(help).toContain("--yes");
  });
});
