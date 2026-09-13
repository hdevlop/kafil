import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

import { getDashboardNavigation } from "../src/shared/DashboardShell/navigation";
import { dashboardKeys } from "../src/features/Dashboard/shared/dashboardKeys";

describe("delivery dashboard source contracts", () => {
  test("shows delivery navigation only after Staff eligibility is resolved", () => {
    expect(getDashboardNavigation("operator").map((item) => item.href)).not.toContain("/delivery");
    expect(getDashboardNavigation("operator", { deliveryEligible: true }).map((item) => item.href)).toContain("/delivery");
    expect(getDashboardNavigation("delivery", { deliveryEligible: true }).map((item) => item.href)).toEqual(["/delivery"]);
    expect(getDashboardNavigation("delivery").map((item) => item.href)).toEqual([]);
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

  test("keeps the Casablanca map mounted when a selected date has no mapped deliveries", () => {
    const page = readFileSync("src/features/Dashboard/DeliveryDashboard/components/DeliveryDashboardPage.tsx", "utf8");
    const map = readFileSync("src/features/Dashboard/DeliveryDashboard/components/DeliveryMap.tsx", "utf8");
    expect(page).toContain("<DeliveryMap");
    expect(page).not.toContain('items.some((item) => item.coordinates) ? <DeliveryMap');
    expect(map).toContain('mappedItems.length === 0');
    expect(map).toContain('map.setView(CASABLANCA, 12)');
  });

  test("keeps delivery date state off the URL and exposes only the Today preset", () => {
    const page = readFileSync("src/features/Dashboard/DeliveryDashboard/components/DeliveryDashboardPage.tsx", "utf8");

    expect(page).not.toContain("useSearchParams");
    expect(page).not.toContain("useRouter");
    expect(page).not.toContain("tomorrowDate");
    expect(page).not.toContain("dashboard.delivery.tomorrow");
    expect(page).toContain('const [date, setDate] = useState(() => casablancaDate())');
    expect(page).toContain('currentUrl.searchParams.delete("date")');
  });

  test("reuses shared attention, quick-action, and dashboard skeleton components", () => {
    const page = readFileSync("src/features/Dashboard/DeliveryDashboard/components/DeliveryDashboardPage.tsx", "utf8");
    const adminAttention = readFileSync("src/features/Dashboard/AdminDashboard/components/AttentionCard.tsx", "utf8");
    const adminActions = readFileSync("src/features/Dashboard/AdminDashboard/components/QuickActionsCard.tsx", "utf8");
    const sponsorActions = readFileSync("src/features/Dashboard/SponsorDashboard/components/SponsorQuickActionsCard.tsx", "utf8");
    const skeletons = readFileSync("src/features/Dashboard/shared/DashboardSkeletons.tsx", "utf8");

    expect(page).toContain("<DashboardAttentionCard");
    expect(page).toContain("<DashboardQuickActionsCard");
    expect(page).toContain("<DeliveryDashboardSkeleton");
    expect(adminAttention).toContain("<DashboardAttentionCard");
    expect(adminActions).toContain("<DashboardQuickActionsCard");
    expect(sponsorActions).toContain("<DashboardQuickActionsCard");
    expect(skeletons).toContain("export function DeliveryDashboardSkeleton");
  });

  test("puts Today and the date picker in the map card header at equal height", () => {
    const page = readFileSync("src/features/Dashboard/DeliveryDashboard/components/DeliveryDashboardPage.tsx", "utf8");

    expect(page).toContain("<NCardAction>");
    expect(page).toContain('className="h-10 px-3"');
    expect(page).toContain('<DateInput');
    expect(page).toContain('className="w-32 sm:w-48"');
  });
});
