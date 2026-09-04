import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const dashboardShell = readFileSync(
  new URL("../src/shared/DashboardShell/index.tsx", import.meta.url),
  "utf8",
);
const settingsSheets = readFileSync(
  new URL("../src/features/Settings/components/SettingsSheets.tsx", import.meta.url),
  "utf8",
);

describe("dashboard auth tab-sync integration", () => {
  test("redirects a mounted protected shell when Najm broadcasts logout", () => {
    expect(dashboardShell).toContain(
      'import { Protected, useLogout } from "najm-auth/client/react"',
    );
    expect(dashboardShell).toContain(
      "onUnauthenticated={beginLogout}",
    );
    expect(dashboardShell).toContain('router.replace("/login")');
    expect(dashboardShell).not.toContain("window.location");
  });

  test("keeps a themed transition visible while logout completes", () => {
    expect(dashboardShell).toContain(
      "fallback={<DashboardAuthTransition />}",
    );
    expect(dashboardShell).toContain(
      '<NLoadingState fullScreen label={t("common.processing")} />',
    );
    expect(dashboardShell.indexOf("queryClient.clear()"))
      .toBeLessThan(dashboardShell.indexOf("void logout()"));
    expect(dashboardShell.indexOf("bindSession(null)"))
      .toBeLessThan(dashboardShell.indexOf("void logout()"));
    expect(dashboardShell.indexOf("void logout()"))
      .toBeLessThan(dashboardShell.indexOf('router.replace("/login")'));
  });

  test("does not keep admin theme queries mounted while both sheets are closed", () => {
    expect(settingsSheets).toContain("!canOpenThemeSettings(role) ||");
    expect(settingsSheets).toContain(
      '(activeSheet !== "theme" && activeSheet !== "branding")',
    );
    expect(settingsSheets.indexOf("if (")).toBeLessThan(
      settingsSheets.indexOf("<NThemeSettingsProvider"),
    );
  });
});
