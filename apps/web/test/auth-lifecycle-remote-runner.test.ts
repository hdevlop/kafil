import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";

import {
  buildRemoteAuthPlaywrightArgs,
  readRemoteAuthGrep,
} from "../scripts/connected-four-account-remote-runtime";

const specUrl = new URL("e2e/auth-lifecycle.remote.ts", import.meta.url);
const runnerUrl = new URL(
  "../scripts/run-auth-lifecycle-remote-e2e.ts",
  import.meta.url,
);
const runtimeUrl = new URL(
  "../scripts/connected-four-account-remote-runtime.ts",
  import.meta.url,
);
const packageUrl = new URL("../package.json", import.meta.url);
const sharedRunnerUrl = new URL(
  "../scripts/remote-acceptance-runner.ts",
  import.meta.url,
);
const configUrl = new URL("../playwright.remote.config.ts", import.meta.url);

const titles = [
  "remote auth 01 - guarded setup and Admin lifecycle",
  "remote auth 02 - Family first-login and lifecycle",
  "remote auth 03 - Sponsor email lifecycle",
  "remote auth 04 - Sponsor phone lifecycle",
  "remote auth 05 - Sponsor same-context email-phone sequence",
  "remote auth 06 - cross-tab logout propagation",
  "remote auth 07 - in-flight protected response logout overlap",
  "remote auth 08 - stale session without refresh is denied and cleared",
  "remote auth 09 - supported cleanup and closure",
  "remote auth diagnostics - final context and cookie-writer assertions",
] as const;

describe("dedicated remote auth lifecycle runner", () => {
  test("owns one separate serial spec with exactly ten planned tests", () => {
    expect(existsSync(specUrl)).toBe(true);
    if (!existsSync(specUrl)) return;

    const source = readFileSync(specUrl, "utf8");
    expect(source).toContain('test.describe.serial("remote auth lifecycle"');
    expect(source.match(/test\("remote auth /g)).toHaveLength(10);
    for (const title of titles) expect(source).toContain(`test("${title}"`);
    expect(source).not.toContain("remote step 01");
    expect(source).not.toContain("page.route(");
    expect(source).not.toContain("clearCookies(");
    expect(source).not.toContain("waitForTimeout(");
    expect(source).not.toContain("force: true");
  });

  test("keeps cookie-writer observation active through protected denial", () => {
    expect(existsSync(specUrl)).toBe(true);
    if (!existsSync(specUrl)) return;

    const source = readFileSync(specUrl, "utf8");
    expect(source).toContain("recordAuthCookieWriters(page, ...observedPages)");
    expect(source).toContain("await expectProtectedDenied(");
    expect(source).toContain("await cookieWriterRecorder.stop()");
    expect(source).toContain("expect(familyList.status).toBe(200)");
    expect(source).toContain("findDisposableAuthMailboxMessages()");
    expect(source).toContain("filter(isDisposableAuthFamily)");
    expect(source).toContain("filter(isDisposableAuthSponsor)");
    expect(source).toContain("if (cleanupSummary)");
    expect(source).toContain("expect(logoutEvidence.length).toBeGreaterThan(0)");
    expect(source.indexOf("await expectProtectedDenied(")).toBeLessThan(
      source.indexOf("await cookieWriterRecorder.stop()"),
    );
    expect(source).toContain("describeRecognizedAuthCookies(cookies)");
    expect(source).not.toContain("cookie.value");
  });

  test("selects only the auth spec and preserves guarded remote contracts", () => {
    expect(existsSync(runnerUrl)).toBe(true);
    if (!existsSync(runnerUrl)) return;

    const runner = readFileSync(runnerUrl, "utf8");
    const sharedRunner = readFileSync(sharedRunnerUrl, "utf8");
    const config = readFileSync(configUrl, "utf8");
    const runtime = readFileSync(runtimeUrl, "utf8");
    const packageJson = JSON.parse(readFileSync(packageUrl, "utf8")) as {
      scripts: Record<string, string>;
    };

    expect(runtime).toContain("buildRemoteAuthPlaywrightArgs");
    expect(runtime).toContain('"test/e2e/auth-lifecycle.remote.ts"');
    expect(runner).toContain("buildRemoteAuthPlaywrightArgs(readRemoteAuthGrep(Bun.env))");
    expect(runner).not.toContain("buildRemotePlaywrightArgs");
    expect(runner).not.toContain("KAFIL_E2E_REMOTE_GREP");
    expect(runner).toContain("rejectRemoteGrep: true");
    expect(buildRemoteAuthPlaywrightArgs("remote auth 0[1-2]").slice(-2)).toEqual([
      "--grep",
      "remote auth 0[1-2]",
    ]);
    expect(readRemoteAuthGrep({
      KAFIL_E2E_REMOTE_AUTH_GREP: "remote auth 0[1-2]|remote auth diagnostics",
    })).toBe("remote auth 0[1-2]|remote auth diagnostics");
    expect(() => readRemoteAuthGrep({
      KAFIL_E2E_REMOTE_AUTH_GREP: "remote auth 01\n--help",
    })).toThrow();
    expect(sharedRunner).toContain("options.rejectRemoteGrep && readRemoteGrep(Bun.env)");
    expect(sharedRunner).toContain('"--preflight-only"');
    expect(sharedRunner).toContain("await waitForMailbox");
    expect(config).toContain("ignoreHTTPSErrors: false");
    expect(packageJson.scripts["test:e2e:auth:remote"]).toContain(
      "run-auth-lifecycle-remote-e2e.ts",
    );
    expect(packageJson.scripts["test:e2e:auth:remote:preflight"]).toContain(
      "--preflight-only",
    );
  });
});
