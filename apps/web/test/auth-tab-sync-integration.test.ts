import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const dashboardShell = readFileSync(
  new URL("../src/shared/DashboardShell/index.tsx", import.meta.url),
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
});
