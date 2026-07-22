import { describe, expect, test } from "bun:test";

import { dashboardKeys } from "../src/features/Dashboard/hooks/useDashboard";
import { getUiTranslation } from "../src/i18n/translations";
import { formatStatusLabel } from "../src/lib/format";
import {
  getDashboardNavigation,
  isDashboardNavigationActive,
} from "../src/shared/DashboardShell";

describe("Phase 7 dashboard presentation contracts", () => {
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
      "/operator/categories",
      "/operator/products",
      "/operator/inventory",
      "/operator/orders",
      "/operator/settings",
    ]);
    expect(navigation.filter((item) => item.sectionLabel).map((item) => item.sectionLabel)).toEqual([
      "nav.supportOperations",
      "nav.finance",
      "nav.catalogOperations",
      "nav.platform",
    ]);
    expect(navigation.every((item) => Boolean(item.icon) && !item.children)).toBe(true);
  });

  test("keeps each role overview exact while matching nested destination routes", () => {
    const navigation = getDashboardNavigation("operator", ((key: string) => key) as never);
    const overview = navigation.find((item) => item.id === "/operator");
    const families = navigation.find((item) => item.id === "/operator/families");

    expect(overview && isDashboardNavigationActive(overview, "/operator")).toBe(true);
    expect(overview && isDashboardNavigationActive(overview, "/operator/families")).toBe(false);
    expect(families && isDashboardNavigationActive(families, "/operator/families/record-1")).toBe(true);
  });

  test("keeps independent role dashboard query caches", () => {
    expect(dashboardKeys.operator).toEqual(["dashboard", "operator"]);
    expect(dashboardKeys.family).toEqual(["dashboard", "family"]);
    expect(dashboardKeys.sponsor).toEqual(["dashboard", "sponsor"]);
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
