import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const webPackage = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
) as { scripts: Record<string, string> };

const runnerSource = readFileSync(
  new URL("../scripts/run-connected-four-account-e2e.ts", import.meta.url),
  "utf8",
);
const playwrightSource = readFileSync(
  new URL("../playwright.config.ts", import.meta.url),
  "utf8",
);
const connectedSpecSource = readFileSync(
  new URL("e2e/connected-four-account.e2e.ts", import.meta.url),
  "utf8",
);
const wrapperSource = readFileSync(
  new URL(
    "../../../.agents/skills/kafil-playwright-testing/scripts/run-connected.ps1",
    import.meta.url,
  ),
  "utf8",
);
const preflightSource = readFileSync(
  new URL(
    "../../../.agents/skills/kafil-playwright-testing/scripts/connected-preflight.mjs",
    import.meta.url,
  ),
  "utf8",
);

describe("connected four-account production runner", () => {
  test("uses one root env file and code-owned loopback acceptance overrides", () => {
    expect(webPackage.scripts["test:e2e:connected"]).toBe(
      "bun --env-file=../../.env scripts/run-connected-four-account-e2e.ts",
    );
    expect(runnerSource).toContain("const localAcceptanceOverrides");
    expect(runnerSource).toContain('SMTP_HOST: "127.0.0.1"');
    expect(runnerSource).toContain(
      'KAFIL_E2E_MAILBOX_API_URL: "http://127.0.0.1:8025"',
    );
    expect(wrapperSource).not.toContain(".env.acceptance");
    expect(wrapperSource).toContain("& bun --env-file=$envFile $probeScript");
    expect(preflightSource).toContain("const localAcceptanceOverrides");
  });

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

  test("uses the authenticated Mailpit v1 batch-delete contract", () => {
    expect(connectedSpecSource).toContain(
      'process.env.KAFIL_E2E_MAILBOX_USER?.trim()',
    );
    expect(connectedSpecSource).toContain(
      'process.env.KAFIL_E2E_MAILBOX_PASSWORD?.trim()',
    );
    expect(connectedSpecSource).toContain(
      'mailboxFetch("/api/v1/messages", {',
    );
    expect(connectedSpecSource).toContain(
      "body: JSON.stringify({ IDs: [messageId] })",
    );
    expect(connectedSpecSource).not.toContain(
      "`${mailboxApiUrl}/api/v1/message/${messageId}`",
    );
  });
});
