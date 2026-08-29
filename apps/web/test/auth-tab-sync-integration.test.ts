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
      'import { SignOutButton, useSession } from "najm-auth/client/react"',
    );
    expect(dashboardShell).toContain(
      'useSession({ required: true, redirectTo: "/login" })',
    );
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
