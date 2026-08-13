import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const runnerSource = readFileSync(
  new URL("../scripts/run-connected-four-account-e2e.ts", import.meta.url),
  "utf8",
);
const playwrightSource = readFileSync(
  new URL("../playwright.config.ts", import.meta.url),
  "utf8",
);

describe("connected four-account production runner", () => {
  test("scopes the trustworthy-origin browser flag to production acceptance", () => {
    expect(runnerSource).toContain(
      'KAFIL_E2E_USE_PRODUCTION: useProductionServer ? "1" : "0"',
    );
    expect(playwrightSource).toContain(
      'process.env.KAFIL_E2E_USE_PRODUCTION === "1"',
    );
    expect(playwrightSource).toContain(
      '"--unsafely-treat-insecure-origin-as-secure=http://127.0.0.1:3210"',
    );
  });
});
