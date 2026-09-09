import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

import { getDashboardNavigation } from "../src/shared/DashboardShell/navigation";
import { dashboardKeys } from "../src/features/Dashboard/shared/dashboardKeys";

describe("delivery dashboard source contracts", () => {
  test("shows delivery navigation only after Staff eligibility is resolved", () => {
    expect(getDashboardNavigation("operator").map((item) => item.href)).not.toContain("/delivery");
    expect(getDashboardNavigation("operator", { deliveryEligible: true }).map((item) => item.href)).toContain("/delivery");
    expect(getDashboardNavigation("admin", { deliveryEligible: true }).map((item) => item.href)).not.toContain("/delivery");
  });

  test("keys every selected date independently", () => {
    expect(dashboardKeys.delivery("2026-09-09")).toEqual(["dashboard", "delivery", "2026-09-09"]);
    expect(dashboardKeys.delivery("2026-09-10")).not.toEqual(dashboardKeys.delivery("2026-09-09"));
  });

  test("keeps the map browser-only and free of tracking or route drawing", () => {
    const page = readFileSync("src/features/Dashboard/DeliveryDashboard/components/DeliveryDashboardPage.tsx", "utf8");
    const map = readFileSync("src/features/Dashboard/DeliveryDashboard/components/DeliveryMap.tsx", "utf8");
    expect(page).toContain("ssr: false");
    expect(map).toContain("L.marker");
    expect(map).not.toContain("polyline");
    expect(map).not.toContain("watchPosition");
    expect(map).not.toContain("geolocation");
  });
});
