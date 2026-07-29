import { describe, expect, test } from "bun:test";

import { dashboardKeys } from "../src/features/Dashboard/hooks/useDashboard";
import { sponsorDashboardKeys } from "../src/features/SponsorDashboard/hooks/sponsorDashboardKeys";
import { getUiTranslation } from "../src/i18n/translations";
import { formatStatusLabel } from "../src/lib/format";
import {
  getDashboardNavigation,
  isDashboardNavigationActive,
} from "../src/shared/DashboardShell";

describe("Phase 7 dashboard presentation contracts", () => {
  test("keeps dashboard pages inside the shared Najm smart scroll viewport", async () => {
    const shellSource = await Bun.file(
      new URL("../src/shared/DashboardShell/index.tsx", import.meta.url),
    ).text();

    expect(shellSource).toContain(
      '<NajmScroll axis="y" className="min-h-0 flex-1">',
    );
    expect(shellSource).toContain(
      'className="flex h-screen w-full overflow-hidden',
    );
  });

  test("uses flat icon-backed operator destinations with native sidebar sections", () => {
    const navigation = getDashboardNavigation("operator", ((key: string) => key) as never);

    expect(navigation.map((item) => item.id)).toEqual([
      "/operator",
      "/operator/families",
      "/operator/children",
      "/operator/sponsors",
      "/operator/assignments",
      "/operator/contributions",
      "/operator/budgets",
      "/categories",
      "/products",
      "/orders",
    ]);
    expect(navigation.filter((item) => item.sectionLabel).map((item) => item.sectionLabel)).toEqual([
      "nav.supportOperations",
      "nav.finance",
      "nav.catalogOperations",
    ]);
    expect(navigation.every((item) => Boolean(item.icon) && !item.children)).toBe(true);
  });

  test("keeps each role overview exact while matching nested destination routes", () => {
    const navigation = getDashboardNavigation("operator", ((key: string) => key) as never);
    const overview = navigation.find((item) => item.id === "/operator");
    const families = navigation.find((item) => item.id === "/operator/families");
    const products = navigation.find((item) => item.id === "/products");

    expect(overview && isDashboardNavigationActive(overview, "/operator")).toBe(true);
    expect(overview && isDashboardNavigationActive(overview, "/operator/families")).toBe(false);
    expect(families && isDashboardNavigationActive(families, "/operator/families/record-1")).toBe(true);
    expect(products && isDashboardNavigationActive(products, "/products")).toBe(true);
    expect(products && isDashboardNavigationActive(products, "/products/123")).toBe(true);
  });

  test("keeps independent role dashboard query caches", () => {
    expect(dashboardKeys.operator).toEqual(["dashboard", "operator"]);
    expect(dashboardKeys.family).toEqual(["dashboard", "family"]);
    expect(sponsorDashboardKeys.overview).toEqual(["sponsor-dashboard", "overview"]);
  });

  test("ships dashboard and refunded-status labels in every supported language", () => {
    for (const language of ["en", "fr", "ar"] as const) {
      expect(getUiTranslation(language, "dashboard.operator.title")).toBeTruthy();
      expect(getUiTranslation(language, "dashboard.family.spendingTrend")).toBeTruthy();
      expect(getUiTranslation(language, "dashboard.sponsor.contributionTrend")).toBeTruthy();
      expect(getUiTranslation(language, "status.refunded")).toBeTruthy();
    }
    expect(formatStatusLabel("refunded", "fr")).toBe("Remboursée");
  });
});
