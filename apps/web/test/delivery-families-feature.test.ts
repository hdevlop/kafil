import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

import { getDashboardNavigation } from "../src/shared/DashboardShell/navigation";

function readSource(path: string) {
  return readFileSync(path, "utf8");
}

describe("delivery families directory source contracts", () => {
  test("keeps one FamiliesPage with sponsor, delivery, and managed branches", () => {
    const page = readSource("src/features/Families/components/FamiliesPage/FamiliesPage.tsx");

    expect(page).toContain("isExactSponsor");
    expect(page).toContain("isExactDelivery");
    expect(page).toContain("<SponsorFamiliesPage");
    expect(page).toContain("<DeliveryFamiliesPage");
    expect(page).toContain("<ManagedFamiliesPage");
    expect(page).toContain("useDeliveryFamiliesTableProps");
    expect(page).toContain('t("dashboard.delivery.familiesTitle")');
    expect(page).toContain('t("dashboard.delivery.familiesSubtitle")');
  });

  test("queries the date-bound directory with search, limit, and offset", () => {
    const api = readSource("src/services/dashboardApi.ts");
    const hook = readSource("src/features/Families/hooks/useDeliveryFamilies.ts");
    const props = readSource("src/features/Families/hooks/useDeliveryFamiliesTableProps.tsx");

    expect(api).toContain('"/dashboard/delivery/families"');
    expect(api).toContain("date: filters.date");
    expect(hook).toContain("useResponsiveOffsetList");
    expect(hook).toContain("dashboardKeys.deliveryFamilies");
    expect(props).toContain("manualPagination");
    expect(props).toContain("createCardPagination");
    expect(api).not.toContain("q:");
    expect(api).not.toContain("page:");
    expect(api).not.toContain("pageSize");
  });

  test("keeps the directory read-only with a dedicated card", () => {
    const props = readSource("src/features/Families/hooks/useDeliveryFamiliesTableProps.tsx");
    const card = readSource("src/features/Families/components/DeliveryFamilyCard.tsx");

    expect(props).toContain("<DeliveryFamilyCard");
    expect(props).toContain("responsiveCards");
    expect(props).not.toContain("onCreate");
    expect(props).not.toContain("onEdit");
    expect(props).not.toContain("onDelete");
    expect(props).not.toContain("menu:");
    expect(card).toContain("export function DeliveryFamilyCard");
    expect(card).not.toContain("components/FamilyCard");
    expect(card).not.toContain("FamilyRecord");
    expect(card).not.toContain("SponsorFamilyView");
    expect(card).not.toContain("FundingProgress");
    expect(card).not.toContain("SupportAssignment");
    expect(card).toContain("<NBadge");
    expect(card).toContain("<NAvatar");
  });

  test("links call and maps through exact href, target, and rel attributes", () => {
    const card = readSource("src/features/Families/components/DeliveryFamilyCard.tsx");
    const columns = readSource("src/features/Families/hooks/useDeliveryFamiliesTableColumns.tsx");

    expect(card).toContain("href={`tel:${data.phone}`}");
    expect(card).toContain("href={mapsUrlForFamily(data)}");
    expect(card).toContain('target="_blank"');
    expect(card).toContain('rel="noopener noreferrer"');
    expect(columns).toContain("https://www.google.com/maps/search/?api=1&query=");
    expect(columns).toContain("href={`tel:${row.original.phone}`}");
    expect(card).not.toContain("window.location.href");
    expect(card).not.toContain("window.open");
  });

  test("invalidates the directory alongside the dashboard date on delivery commands", () => {
    const commands = readSource("src/features/Dashboard/DeliveryDashboard/hooks/useDeliveryDashboard.ts");

    expect(commands).toContain("dashboardKeys.delivery(date)");
    expect(commands).toContain("dashboardKeys.deliveryFamilies");
  });

  test("extends the existing /family navigation row with the delivery role", () => {
    const navigation = readSource("src/shared/DashboardShell/navigation.ts");
    const auth = readSource("src/najm.config.ts");

    expect(navigation).toContain('roles: ["admin", "operator", "sponsor", "delivery"]');
    expect(auth).toContain('"/family": ["admin", "operator", "sponsor", "delivery"]');
    expect(navigation).not.toContain("deliveryOnly");
    expect(navigation).not.toContain('href: "/delivery/families"');
    expect(getDashboardNavigation("delivery").map((item) => item.href)).toContain("/family");
    expect(getDashboardNavigation("delivery").map((item) => item.href)).not.toContain("/sponsors");
    expect(getDashboardNavigation("operator").map((item) => item.href)).toContain("/family");
  });

  test("ships the directory copy in every locale", () => {
    for (const locale of ["en", "fr", "ar", "es"]) {
      const dictionary = JSON.parse(
        readSource(`../../packages/server/src/locales/${locale}.json`),
      ) as { ui: { dashboard: { delivery: Record<string, string> } } };
      const delivery = dictionary.ui.dashboard.delivery;

      for (const key of [
        "familiesTitle",
        "familiesSubtitle",
        "familiesSearch",
        "familiesAccount",
        "familiesPhone",
        "familiesOrders",
        "familiesOrdersCount",
        "familiesStatus",
        "familiesNextWindow",
        "familiesEmpty",
        "familiesEmptyHint",
        "familiesNoData",
        "familiesLoading",
      ]) {
        expect(typeof delivery[key]).toBe("string");
      }
    }
  });
});
