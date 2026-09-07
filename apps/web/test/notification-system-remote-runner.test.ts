import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";

import {
  buildRemoteNotificationsPlaywrightArgs,
  readRemoteNotificationsGrep,
} from "../scripts/connected-four-account-remote-runtime";

const specUrl = new URL("e2e/notification-system.remote.ts", import.meta.url);
const runnerUrl = new URL(
  "../scripts/run-notification-system-remote-e2e.ts",
  import.meta.url,
);
const runtimeUrl = new URL(
  "../scripts/connected-four-account-remote-runtime.ts",
  import.meta.url,
);
const sharedRunnerUrl = new URL(
  "../scripts/remote-acceptance-runner.ts",
  import.meta.url,
);
const configUrl = new URL(
  "../playwright.notifications.remote.config.ts",
  import.meta.url,
);
const packageUrl = new URL("../package.json", import.meta.url);

const titles = [
  "remote notifications 01 - four-account setup and empty inbox ownership",
  "remote notifications 02 - contribution fan-out, polling, and read persistence",
  "remote notifications 03 - mark-all boundary and later unread event",
  "remote notifications 04 - applicant inbox and single Mailpit decision email",
  "remote notifications 05 - cross-user inbox isolation and exact 404",
  "remote notifications 06 - push subscription persistence and account transfer",
  "remote notifications 07 - Arabic phone RTL, keyboard, and focus restoration",
  "remote notifications 08 - supported cleanup, logout, and closure",
  "remote notifications diagnostics - final contexts and delivery assertions",
] as const;

describe("dedicated remote notification system runner", () => {
  test("owns one isolated serial spec with exactly nine planned tests", () => {
    expect(existsSync(specUrl)).toBe(true);
    if (!existsSync(specUrl)) return;

    const source = readFileSync(specUrl, "utf8");
    expect(source).toContain(
      'test.describe.serial("remote notification system acceptance"',
    );
    expect(source.match(/test\("remote notifications /g)).toHaveLength(9);
    for (const title of titles) expect(source).toContain(`test("${title}"`);
    expect(source).not.toContain("remote step 01");
    expect(source).not.toContain("remote auth 01");
    expect(source).not.toContain("page.route(");
    expect(source).not.toContain("clearCookies(");
    expect(source).not.toContain("waitForTimeout(");
    expect(source).not.toContain("force: true");
    expect(source).not.toContain("console.log(");
    expect(source).not.toContain("console.error(");
  });

  test("pins the real-service notification and cleanup contracts", () => {
    expect(existsSync(specUrl)).toBe(true);
    if (!existsSync(specUrl)) return;

    const source = readFileSync(specUrl, "utf8");
    expect(source).toContain('"/api/notifications/unread-count"');
    expect(source).toContain('"/api/notifications/read-all"');
    expect(source).toContain('`/api/notifications/${id}/read`');
    expect(source).toContain('"/api/notifications/push-subscriptions"');
    expect(source).toContain("registration.pushManager.getSubscription()");
    expect(source).toContain("grantPermissions([\"notifications\"]");
    expect(source).toContain("const NOTIFICATION_POLL_DEADLINE_MS = 30_000;");
    expect(source).toContain("setTimeout(resolve, NOTIFICATION_POLL_INTERVAL_MS)");
    expect(source).toContain('await principal.page.goto("/notifications"');
    expect(source).toContain("@data-slot='indicator'");
    expect(source).toContain('await familyPage.reload({ waitUntil: "commit" })');
    expect(source).toContain("expectWithinViewport");
    expect(source).toContain("X-Kafil-Delivery-Id");
    expect(source).toContain("&lt;Proof&gt;");
    expect(source).toContain(
      'subjectKeyword: "activate your sponsor account"',
    );
    expect(source).not.toContain('subjectKeyword: "invited"');
    expect(source).toContain("فتح الإشعارات");
    expect(source).toContain("تعيين كمقروء");
    expect(source).toContain("assertRunOwnedRecord");
    expect(source).toContain("valueFreePath");
    expect(source).toContain('databaseOnlyGuarantees: "NOT VERIFIED"');
  });

  test("selects only the notification spec and rejects other suite greps", () => {
    expect(existsSync(runnerUrl)).toBe(true);
    expect(existsSync(configUrl)).toBe(true);
    if (!existsSync(runnerUrl) || !existsSync(configUrl)) return;

    const runner = readFileSync(runnerUrl, "utf8");
    const runtime = readFileSync(runtimeUrl, "utf8");
    const sharedRunner = readFileSync(sharedRunnerUrl, "utf8");
    const config = readFileSync(configUrl, "utf8");
    const packageJson = JSON.parse(readFileSync(packageUrl, "utf8")) as {
      scripts: Record<string, string>;
    };

    expect(runtime).toContain("buildRemoteNotificationsPlaywrightArgs");
    expect(runtime).toContain('"test/e2e/notification-system.remote.ts"');
    expect(runner).toContain(
      "buildRemoteNotificationsPlaywrightArgs(\n      readRemoteNotificationsGrep(Bun.env),",
    );
    expect(runner).toContain("rejectRemoteGrep: true");
    expect(runner).toContain("rejectRemoteAuthGrep: true");
    expect(runner).toContain('extraReadinessPaths: ["/notifications"]');
    expect(sharedRunner).toContain("options.rejectRemoteAuthGrep");
    expect(sharedRunner).toContain("options.extraReadinessPaths");
    expect(sharedRunner).toContain("NO MANAGED MAILBOX TRANSPORT");

    const grep = "remote notifications 0[1-2]|remote notifications diagnostics";
    expect(readRemoteNotificationsGrep({
      KAFIL_E2E_REMOTE_NOTIFICATIONS_GREP: ` ${grep} `,
    })).toBe(grep);
    expect(
      buildRemoteNotificationsPlaywrightArgs(grep).slice(-2),
    ).toEqual(["--grep", grep]);
    expect(buildRemoteNotificationsPlaywrightArgs()).not.toContain("--grep");
    expect(() => readRemoteNotificationsGrep({
      KAFIL_E2E_REMOTE_NOTIFICATIONS_GREP: "unit 01\n--help",
    })).toThrow();

    expect(config).toContain('testMatch: "notification-system.remote.ts"');
    expect(config).toContain("ignoreHTTPSErrors: false");
    expect(config).toContain("retries: 0");
    expect(config).toContain("workers: 1");
    expect(config).toContain('screenshot: "off"');
    expect(config).toContain('trace: "off"');
    expect(config).toContain('video: "off"');
    expect(config).toContain("webServer: undefined");
    expect(packageJson.scripts["test:e2e:notifications:remote"]).toContain(
      "run-notification-system-remote-e2e.ts",
    );
    expect(
      packageJson.scripts["test:e2e:notifications:remote:preflight"],
    ).toContain("--preflight-only");
  });
});
