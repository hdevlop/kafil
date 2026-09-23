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
  test("installs the native Sharp binaries at the web runtime boundary", () => {
    const optionalDependencies = (
      webPackage as typeof webPackage & {
        optionalDependencies?: Record<string, string>;
      }
    ).optionalDependencies;

    expect(optionalDependencies?.["@img/sharp-win32-x64"]).toBe("0.35.3");
    expect(optionalDependencies?.["@img/sharp-linux-x64"]).toBe("0.35.3");
    expect(optionalDependencies?.["@img/sharp-libvips-linux-x64"]).toBe("1.3.2");
  });

  test("uses one app-local env file and code-owned loopback acceptance overrides", () => {
    expect(webPackage.scripts["test:e2e:connected"]).toBe(
      "bun --env-file=.env.local scripts/run-connected-four-account-e2e.ts",
    );
    expect(runnerSource).toContain("const localAcceptanceOverrides");
    expect(runnerSource).toContain('SMTP_HOST: "127.0.0.1"');
    expect(runnerSource).toContain(
      'KAFIL_E2E_MAILBOX_API_URL: "http://127.0.0.1:8025"',
    );
    expect(wrapperSource).not.toContain(".env.acceptance");
    expect(wrapperSource).toContain('"apps\\web\\.env.local"');
    expect(wrapperSource).toContain("& bun --env-file=$envFile $probeScript");
    expect(preflightSource).toContain("const localAcceptanceOverrides");
  });

  test("requires loopback Redis and forwards it to the owned Next process", () => {
    expect(runnerSource).toContain(
      'name: "REDIS_CONFIGURATION_PRESENT"',
    );
    expect(runnerSource).toContain('name: "REDIS_HOST_IS_LOOPBACK"');
    expect(runnerSource).toContain(
      'name: "REDIS_AUTHENTICATION_PRESENT_FOR_PRODUCTION"',
    );
    expect(runnerSource).toContain('REDIS_URL: readEnv("REDIS_URL")');
    expect(preflightSource).toContain(
      '["REDIS_CONFIGURATION_PRESENT", Boolean(value("REDIS_URL"))]',
    );
    expect(preflightSource).toContain('["REDIS_HOST_IS_LOOPBACK", isRedisLoopback()]');
    expect(preflightSource).toContain(
      '"REDIS_AUTHENTICATION_PRESENT_FOR_PRODUCTION"',
    );
    expect(wrapperSource).toContain("$previousPreflightProduction");
    expect(preflightSource).toContain("await probeRedis()");
  });

  test("loads the web Sharp runtime before startup and fails fast on health 500", () => {
    expect(preflightSource).toContain('requireFromWeb("sharp")');
    expect(preflightSource).toContain("SHARP_RUNTIME_LOADABLE");
    expect(runnerSource).toContain('"SystemRoot"');
    expect(runnerSource).toContain('"PATH"');
    expect(runnerSource).toContain("runtimeEnvironmentAllowlist");
    expect(runnerSource).toContain("if (response.status >= 500)");
    expect(runnerSource).toContain(
      "Connected acceptance health check returned ${response.status}",
    );
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
      "body: JSON.stringify({ IDs: messageIds })",
    );
    expect(connectedSpecSource).not.toContain(
      "`${mailboxApiUrl}/api/v1/message/${messageId}`",
    );
    expect(connectedSpecSource).toContain(
      "mailboxMessageIdsForRecipient(sponsorAEmail)",
    );
    expect(connectedSpecSource).toContain(
      'Address.trim().toLowerCase() === normalizedRecipient',
    );
    expect(connectedSpecSource).toContain(
      "expect(await mailboxMessageIdsForRecipient(sponsorAEmail)).toEqual([])",
    );
  });

  /** One work unit's own source, bounded by the next unit rather than the file. */
  function workUnitSource(header: string) {
    const start = connectedSpecSource.indexOf(header);
    expect(start).toBeGreaterThan(-1);
    const nextUnit = connectedSpecSource.indexOf('  test("', start + header.length);
    const end = nextUnit === -1 ? connectedSpecSource.length : nextUnit;
    return connectedSpecSource.slice(start, end);
  }

  test("makes work unit H prove its responsive, RTL, keyboard, and runtime claims", () => {
    const workUnitH = workUnitSource(
      'test("work unit H — responsive, RTL, keyboard, and state evidence"',
    );

    expect(workUnitH).toContain("attachDiagnostics(adminPage, adminDiagnostics)");
    expect(workUnitH).toContain('expect(dashboardDocument.finalPath).toBe("/dashboard")');
    expect(workUnitH).toContain('for (const key of ["desktop", "tablet", "phone"] as const)');
    expect(workUnitH).toContain('name: "Language"');
    expect(workUnitH).toContain('name: /Arabic/');
    expect(workUnitH).toContain('pathname === "/api/ui-language"');
    expect(workUnitH).toContain('toHaveAttribute("dir", "rtl")');
    expect(workUnitH).toContain('name: "Toggle color theme"');
    expect(workUnitH).toContain('await adminPage.keyboard.press("Enter")');
    expect(workUnitH).toContain('pathname === "/api/ui-theme"');
    expect(workUnitH).toContain("navigator.serviceWorker.getRegistration");
    expect(workUnitH).toContain('onlyVisible(adminPage.locator("aside img"))');
    expect(workUnitH).toContain("image.complete && image.naturalWidth > 0");
    expect(workUnitH).toContain('response.headers.get("content-security-policy")');
    expect(workUnitH.lastIndexOf("setViewportSize(VIEWPORTS.desktop)")).toBeLessThan(
      workUnitH.indexOf("await signOut(adminPage)"),
    );
    expect(workUnitH).toContain("await signOut(adminPage)");
  });

  test("makes work unit I prove the Delivery-owned purchase journey without mocks", () => {
    const workUnitI = workUnitSource(
      'test("work unit I — Delivery-owned purchase, start, and confirm"',
    );

    // Real identities, real transport: no route interception anywhere. The
    // header comment names `page.route()` as forbidden, so match a call site
    // rather than the prose.
    const routeCallSites = connectedSpecSource
      .split("\n")
      .filter((line) => !line.trim().startsWith("*") && line.includes(".route("));
    expect(routeCallSites).toEqual([]);
    expect(workUnitI).toContain("attachDiagnostics(ahmedPage, deliveryADiagnostics)");
    expect(workUnitI).toContain("attachDiagnostics(youssefPage, deliveryBDiagnostics)");
    expect(workUnitI).toContain("setViewportSize(VIEWPORTS.phone)");

    // Ahmed reaches the order only through the Delivery-owned endpoints.
    expect(workUnitI).toContain("/delivery/me`");
    expect(workUnitI).toContain("/purchase/me`");
    expect(workUnitI).toContain("/api/order-evidence/me/receipts/");
    expect(workUnitI).not.toContain("/api/orders/${state.deliveryOrderId}/purchase`");
    expect(workUnitI).not.toContain("purchase/replace");

    // Map first, nothing layered over the markers, one right-side sheet.
    expect(workUnitI).toContain('must follow the map');
    expect(workUnitI).toContain(
      'expect(ahmedPage.getByRole("button", { name: "Validate purchase" })).toHaveCount(0)',
    );
    expect(workUnitI).toContain("sheetBox.x + sheetBox.width");
    expect(workUnitI).toContain("documentWidth).toBeLessThanOrEqual");

    // The denied worker is asserted as one exact negative response each.
    expect(workUnitI).toContain('status: 403 }');
    expect(workUnitI).toContain("expectExactNegativeResponse(");
    expect(workUnitI).toContain('expect(afterDenial[0]?.count).toBe("0")');

    // Exact persisted financial effect in integer minor units.
    expect(workUnitI).toContain("recorded_by_user_id: state.deliveryAUserId");
    expect(workUnitI).toContain('expect(orderRows[0]?.status).toBe("purchased")');
    expect(workUnitI).toContain('"order_capture",');
    expect(workUnitI).toContain('"order_release",');
    expect(workUnitI).toContain("formatMadFromMinor(fixture.order4ActualMinor)");
    expect(workUnitI).not.toContain("parseFloat");
    expect(workUnitI).not.toContain("toFixed(");

    // The footer advances only after a fresh server response.
    expect(workUnitI.indexOf('name: "Start delivery" })).toBeVisible')).toBeGreaterThan(
      workUnitI.indexOf("expect((await purchaseResponse).status())"),
    );
    expect(workUnitI).toContain('attempt_status: "delivered"');

    // Family privacy holds inside the Delivery sheet.
    expect(workUnitI).toContain("expect(sheet.getByText(state.familyCin!, { exact: true })).toHaveCount(0)");
  });
});
