import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

import { getDashboardNavigation } from "../src/shared/DashboardShell/navigation";
import {
  buildNotificationViewModel,
  formatBadgeCount,
  normalizeLocale,
} from "../src/features/Notifications/lib/buildNotificationViewModel";
import { notificationKeys } from "../src/features/Notifications/hooks/notificationKeys";
import { synchronizeNotificationLocale } from "../src/features/Notifications/lib/synchronizeNotificationLocale";
import { canOpenPersonalSettings } from "../src/features/Settings/components/PersonalSettingsSheet";

function readSource(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

const ALL_TOPICS = [
  "contribution.submitted",
  "contribution.recorded",
  "contribution.validated",
  "contribution.rejected",
  "contribution.refunded",
  "contribution.expired",
  "order.submitted",
  "order.assisted_submitted",
  "order.approved",
  "order.rejected",
  "order.purchase_recorded",
  "order.purchase_replaced",
  "order.delivery_assigned",
  "order.delivery_reassigned",
  "order.delivery_started",
  "order.delivery_failed",
  "order.delivered",
  "order.cancelled",
  "family.fundingActivated",
  "applicant.approved",
  "applicant.rejected",
] as const;

const FALLBACK = { unknownTitle: "New activity", unknownBody: "Details." };

describe("Phase B notification query contracts", () => {
  test("query-key family covers list, unread-count, settings, and push-config", () => {
    expect(notificationKeys.all).toEqual(["notifications"]);
    expect(notificationKeys.unreadCount()).toEqual([
      "notifications",
      "unread-count",
    ]);
    expect(notificationKeys.settings()).toEqual(["notifications", "settings"]);
    expect(notificationKeys.pushConfig()).toEqual([
      "notifications",
      "push-config",
    ]);
    expect(
      notificationKeys.list({ limit: 20, unread: true }),
    ).toEqual(["notifications", "list", { limit: 20, unread: true }]);
  });

  test("only the unread-count query polls at 30 seconds", async () => {
    const [queries, commands, popover] = await Promise.all([
      readSource("../src/features/Notifications/hooks/useNotifications.ts"),
      readSource(
        "../src/features/Notifications/hooks/useNotificationCommands.ts",
      ),
      readSource(
        "../src/features/Notifications/components/NotificationPopover.tsx",
      ),
    ]);

    expect(queries).toContain("refetchInterval: 30_000");
    const polling = queries.match(/refetchInterval:/g) ?? [];
    expect(polling).toHaveLength(1);
    expect(queries).toContain("refetchIntervalInBackground: false");
    // The controlled popover remounts its query body on every open, so
    // refetchOnMount is an actual open-time contract instead of a stale cache.
    expect(popover).toContain('refetchOnMount: "always"');
    expect(popover).toContain("{open ? (");
    expect(popover).toContain("<NotificationPopoverBody");
    expect(popover).toContain(") : null}");
    const page = readSource(
      "../src/features/Notifications/components/NotificationsPage.tsx",
    );
    expect(page).toContain('refetchOnMount: "always"');
    expect(page).toContain("useNotificationsTableFilters");
    expect(page).toContain("filters,");
    expect(page).not.toContain('role="group"');
    expect(commands).toContain("notificationKeys.all");
    expect(commands).toContain("notificationKeys.unreadCount()");
  });

  test("mark commands invalidate the list and count families", async () => {
    const commands = await readSource(
      "../src/features/Notifications/hooks/useNotificationCommands.ts",
    );
    expect(commands).toContain("useMarkNotificationRead");
    expect(commands).toContain("useMarkAllNotificationsRead");
    expect(commands).toContain("markNotificationRead");
    expect(commands).toContain("markAllNotificationsRead");
    expect(commands).toContain("INVALIDATE_ALL");
  });
});

describe("Phase B notification shell and navigation", () => {
  test("every role has the inbox route", () => {
    for (const role of ["admin", "operator", "family", "sponsor"] as const) {
      expect(
        getDashboardNavigation(role).map((item) => item.href),
      ).toContain("/notifications");
    }
  });

  test("the page-global action group owns one themed bell", async () => {
    const [shell, globalActions] = await Promise.all([
      readSource("../src/shared/DashboardShell/index.tsx"),
      readSource("../src/shared/PageHeaderGlobalActions.tsx"),
    ]);
    expect(shell).not.toContain("NotificationsMenu");
    expect(
      (shell.match(/<NotificationBell/g) ?? []).length,
    ).toBe(0);
    expect(
      (globalActions.match(/<NotificationsMenu/g) ?? []).length,
    ).toBe(1);
    expect(globalActions).not.toContain("NotificationBell");

    const bell = await readSource(
      "../src/features/Notifications/components/NotificationBell.tsx",
    );
    expect(bell).toContain("text-foreground");
    expect(bell).toContain("[&_svg]:text-foreground");
  });

  test("auth guards the inbox route for every role", async () => {
    const auth = await readSource("../src/lib/auth.ts");
    expect(auth).toContain('"/notifications"');
    expect(auth).toContain('"admin", "operator", "family", "sponsor"');
  });
});

describe("Phase B notification view models", () => {
  test("badge hides at zero, localizes 1-99, and caps at 99+", () => {
    expect(formatBadgeCount(0, "en")).toBe("");
    expect(formatBadgeCount(-3, "en")).toBe("");
    expect(formatBadgeCount(99, "en")).not.toBe("");
    expect(formatBadgeCount(99, "en")).not.toBe("99+");
    expect(formatBadgeCount(100, "en")).toBe("99+");
    expect(formatBadgeCount(1000, "en")).toBe("99+");
  });

  test("every registry topic renders localized copy in all four locales", () => {
    for (const topic of ALL_TOPICS) {
      for (const locale of ["en", "fr", "ar", "es"] as const) {
        const vm = buildNotificationViewModel(topic, locale, FALLBACK);
        expect(vm.title.length).toBeGreaterThan(0);
        expect(vm.body.length).toBeGreaterThan(0);
        expect(vm.title).not.toBe(FALLBACK.unknownTitle);
        expect(vm.href.startsWith("/")).toBe(true);
      }
    }
  });

  test("unknown topics render a generic safe row without payload values", () => {
    const vm = buildNotificationViewModel("order.something-new", "en", FALLBACK);
    expect(vm.title).toBe(FALLBACK.unknownTitle);
    expect(vm.body).toBe(FALLBACK.unknownBody);
    expect(vm.href).toBe("/dashboard");
  });

  test("view models never interpolate raw payloads or external links", async () => {
    const source = await readSource(
      "../src/features/Notifications/lib/buildNotificationViewModel.ts",
    );
    expect(source).not.toContain("payload[");
    expect(source).not.toContain("payload.");
    expect(source).not.toContain("http://");
    expect(source).not.toContain("https://");
    expect(source).toContain("Unknown topics render a generic safe row");
  });

  test("locale normalization falls back to English", () => {
    expect(normalizeLocale("fr")).toBe("fr");
    expect(normalizeLocale("ar")).toBe("ar");
    expect(normalizeLocale("es")).toBe("es");
    expect(normalizeLocale("de")).toBe("en");
    expect(normalizeLocale(null)).toBe("en");
    expect(normalizeLocale(undefined)).toBe("en");
  });
});

describe("Phase B notification push presentation", () => {
  test("family and sponsor recipients can open personal push settings", async () => {
    expect(canOpenPersonalSettings("family")).toBe(true);
    expect(canOpenPersonalSettings("sponsor")).toBe(true);
    expect(canOpenPersonalSettings("admin")).toBe(false);
    expect(canOpenPersonalSettings("operator")).toBe(false);

    const [shell, personalSettings] = await Promise.all([
      readSource("../src/shared/DashboardShell/index.tsx"),
      readSource(
        "../src/features/Settings/components/PersonalSettingsSheet.tsx",
      ),
    ]);
    expect(shell).toContain("canOpenPersonalSettings(user.role)");
    expect(shell).toContain("<PersonalSettingsSheet");
    expect(personalSettings).toContain("<PushOptIn />");
  });

  test("push opt-in covers unsupported, denied, granted, and unsubscribe states", async () => {
    const source = await readSource(
      "../src/features/Notifications/components/PushOptIn.tsx",
    );
    expect(source).toContain('"unsupported"');
    expect(source).toContain('"denied"');
    expect(source).toContain('"granted"');
    expect(source).toContain('"prompt"');
    expect(source).toContain("pushUnsupported");
    expect(source).toContain("pushDenied");
    expect(source).toContain('checked={status === "granted"}');
    expect(source).toContain("pushIosHint");
    expect(source).toContain("requestPermission");
    expect(source).toContain("unsubscribe");
    expect(source).toContain("user gesture");
    expect(source).toContain("account switch");
  });
});

describe("Phase B notification locale sync", () => {
  test("reconciles a changed locale and reports a non-blocking failure", async () => {
    const updates: string[] = [];
    expect(await synchronizeNotificationLocale("fr", {
      getSettings: async () => ({ locale: "en" }),
      updateSettings: async (locale) => { updates.push(locale); },
    })).toBe(true);
    expect(updates).toEqual(["fr"]);

    expect(await synchronizeNotificationLocale("ar", {
      getSettings: async () => ({ locale: "ar" }),
      updateSettings: async (locale) => { updates.push(locale); },
    })).toBe(true);
    expect(updates).toEqual(["fr"]);

    expect(await synchronizeNotificationLocale("es", {
      getSettings: async () => { throw new Error("offline"); },
      updateSettings: async () => undefined,
    })).toBe(false);
  });

  test("language changes sync notification locale without blocking the UI", async () => {
    const [globalActions, page] = await Promise.all([
      readSource("../src/shared/PageHeaderGlobalActions.tsx"),
      readSource(
        "../src/features/Notifications/components/NotificationsPage.tsx",
      ),
    ]);
    expect(globalActions).toContain("updateNotificationSettings");
    expect(globalActions).toContain("never blocks the UI");
    expect(page).toContain("getNotificationSettings");
    expect(page).toContain("updateNotificationSettings");
    expect(page).toContain("settingsFailed");
    expect(page).toContain("}, [language]);");
  });
});

describe("Phase B notification accessibility", () => {
  test("bell announces count changes and popover keeps keyboard focus", async () => {
    const [bell, popover, card] = await Promise.all([
      readSource("../src/features/Notifications/components/NotificationBell.tsx"),
      readSource(
        "../src/features/Notifications/components/NotificationPopover.tsx",
      ),
      readSource("../src/features/Notifications/components/NotificationCard.tsx"),
    ]);
    expect(bell).toContain('aria-live="polite"');
    expect(bell).toContain("aria-label");
    expect(popover).toContain("Popover");
    expect(popover).toContain("returns focus to the trigger");
    expect(card).toContain("markRead");
    expect(card).toContain("onNavigate=");
    expect(card).not.toContain("mutateAsync(notification.id).then");
    expect(popover).toContain("Opening the popover never marks rows read");
  });

  test("the local development runner excludes production notification acceptance", () => {
    const runner = readSource("../scripts/run-phase6-e2e.ts");
    expect(runner).not.toContain('"test/e2e/notifications.e2e.ts"');
  });
});

describe("Phase E notification deployment contracts", () => {
  test("worker has private database access plus dedicated outbound HTTPS", () => {
    const compose = readSource("../../../compose.production.yml");
    const workerStart = compose.indexOf("  notifications-worker:");
    const worker = compose.slice(
      workerStart,
      compose.indexOf("  postgres:", workerStart),
    );

    expect(worker).toContain("      - backend");
    expect(worker).toContain("      - notifications-egress");
    expect(worker).not.toContain("      - frontend");
    expect(worker).not.toContain("ports:");
    expect(compose).toContain("  backend:\n    internal: true");
    expect(compose).toContain("  notifications-egress:");
  });

  test("heartbeat remains live while a provider batch is running", () => {
    const worker = readSource(
      "../../../packages/server/src/modules/notifications/notificationWorker.ts",
    );
    const initialBeat = worker.indexOf("await this.beat();");
    const interval = worker.indexOf("const heartbeatTimer = setInterval");
    const dispatchLoop = worker.indexOf("while (!this.stopped)");

    expect(initialBeat).toBeGreaterThan(0);
    expect(interval).toBeGreaterThan(initialBeat);
    expect(dispatchLoop).toBeGreaterThan(interval);
    expect(worker).toContain("clearInterval(heartbeatTimer)");
    expect(worker).toContain("HEARTBEAT_INTERVAL_MS = 10_000");
  });

  test("first worker rollout can roll back to a release without that service", () => {
    const deploy = readSource("../../../scripts/deployVps.sh");

    expect(deploy).toContain('"${compose[@]}" stop notifications-worker || true');
    expect(deploy).toContain("local previous_services=(app)");
    expect(deploy).toContain("config --services | grep -qx 'notifications-worker'");
    expect(deploy).toContain('up -d --no-deps "${previous_services[@]}"');
  });

  test("deployment verification checks image content, OCI revision, and migration journal", () => {
    const verify = readSource("../../../scripts/verifyVpsDeployment.sh");
    const deploy = readSource("../../../scripts/deployVps.sh");

    for (const source of [verify, deploy]) {
      expect(source).toContain("docker inspect --format '{{.Image}}'");
      expect(source).toContain("org.opencontainers.image.revision");
    }
    expect(verify).toContain("drizzle.__drizzle_migrations");
    expect(verify).toContain("created_at = 1788721129026");
    expect(deploy).toContain('"${running_digest}" != "${expected_digest}"');
  });

});
