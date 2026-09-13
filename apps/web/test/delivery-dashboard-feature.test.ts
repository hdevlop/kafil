import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

import { getDashboardNavigation } from "../src/shared/DashboardShell/navigation";
import { dashboardKeys } from "../src/features/Dashboard/shared/dashboardKeys";

describe("delivery dashboard source contracts", () => {
  test("gives every account role one dashboard navigation entry", () => {
    expect(getDashboardNavigation("operator").map((item) => item.href)).toContain("/dashboard");
    expect(getDashboardNavigation("delivery").map((item) => item.href)).toEqual(["/dashboard", "/family"]);
    expect(getDashboardNavigation("admin").map((item) => item.href)).not.toContain("/delivery");
    expect(getDashboardNavigation("operator").map((item) => item.href)).not.toContain("/delivery");
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
    expect(map).toContain('if (points.length > 0)');
    expect(map).toContain('map.setView(CASABLANCA, 12)');
    expect(map).not.toContain('role="status"');
    expect(page).not.toContain('emptyTitle={t("dashboard.delivery.noMapLocations")}');
  });

  test("keeps delivery date state off the URL and exposes only the Today preset", () => {
    const page = readFileSync("src/features/Dashboard/DeliveryDashboard/components/DeliveryDashboardPage.tsx", "utf8");

    expect(page).not.toContain("useSearchParams");
    expect(page).not.toContain("useRouter");
    expect(page).not.toContain("tomorrowDate");
    expect(page).not.toContain("dashboard.delivery.tomorrow");
    expect(page).toContain('const [date, setDate] = useState(() => casablancaToday())');
    expect(page).toContain('from "../../shared/deliveryTime"');
    expect(page).not.toContain("function casablancaDate");
    expect(page).not.toContain("function minuteLabel");
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

  test("does not present the selected delivery as an attention item", () => {
    const page = readFileSync("src/features/Dashboard/DeliveryDashboard/components/DeliveryDashboardPage.tsx", "utf8");
    const attentionCard = page.slice(
      page.indexOf("<DashboardAttentionCard"),
      page.indexOf("<DashboardQuickActionsCard"),
    );

    expect(attentionCard).not.toContain("selected.familyName");
    expect(attentionCard).not.toContain("selected.category");
  });

  test("puts Today and the date picker in the map card header at equal height", () => {
    const page = readFileSync("src/features/Dashboard/DeliveryDashboard/components/DeliveryDashboardPage.tsx", "utf8");

    expect(page).toContain("<NCardAction>");
    expect(page).toContain('className="h-10 px-3"');
    expect(page).toContain('<DateInput');
    expect(page).toContain('className="w-32 sm:w-48"');
  });

  test("keeps the dashboard and Leaflet map mounted while a new date loads", () => {
    const page = readFileSync("src/features/Dashboard/DeliveryDashboard/components/DeliveryDashboardPage.tsx", "utf8");
    const hook = readFileSync("src/features/Dashboard/DeliveryDashboard/hooks/useDeliveryDashboard.ts", "utf8");

    expect(hook).toContain('import { keepPreviousData } from "@tanstack/react-query"');
    expect(hook).toContain("placeholderData: keepPreviousData");
    expect(page).toContain("if (!next || next === date) return;");
    expect(page).toContain("dashboard.isPlaceholderData && dashboard.isFetching");
    expect(page).toContain("isDateTransition ? (");
    expect(page).toContain('<NSpinner aria-hidden="true" size={18} />');
  });
});
