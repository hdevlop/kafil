import { describe, expect, test } from "bun:test";

import { dashboardKeys } from "../src/features/Dashboard/shared/dashboardKeys";
import { sponsorDashboardKeys } from "../src/features/Dashboard/SponsorDashboard/hooks/sponsorDashboardKeys";
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
      "/dashboard",
      "/operator/families",
      "/operator/children",
      "/operator/sponsors",
      "/operator/assignments",
      "/contribution",
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

  test("keeps family navigation focused on household, catalog, and orders", () => {
    const navigation = getDashboardNavigation("family", ((key: string) => key) as never);

    expect(navigation.map((item) => item.id)).toEqual([
      "/dashboard",
      "/family/children",
      "/contribution",
      "/categories",
      "/products",
      "/orders",
    ]);
    expect(navigation.filter((item) => item.sectionLabel).map((item) => item.sectionLabel)).toEqual([
      "nav.household",
      "nav.finance",
      "nav.catalogOperations",
    ]);
  });

  test("removes standalone budget routes from every role", async () => {
    for (const route of [
      "operator/budgets",
      "family/budget",
      "sponsor/budgets",
    ]) {
      expect(
        await Bun.file(
          new URL(`../src/app/(dashboard)/${route}/page.tsx`, import.meta.url),
        ).exists(),
      ).toBe(false);
    }

    for (const role of ["admin", "operator", "family", "sponsor"]) {
      const navigation = getDashboardNavigation(
        role,
        ((key: string) => key) as never,
      );
      expect(navigation.some((item) => item.href?.includes("budget"))).toBe(
        false,
      );
    }
  });

  test("routes sponsor Orders through the same canonical surface", async () => {
    const navigation = getDashboardNavigation(
      "sponsor",
      ((key: string) => key) as never,
    );
    const authSource = await Bun.file(
      new URL("../src/lib/auth.ts", import.meta.url),
    ).text();

    expect(navigation.some((item) => item.href === "/orders")).toBe(true);
    expect(navigation.some((item) => item.href === "/sponsor/orders")).toBe(
      false,
    );
    expect(authSource).toContain(
      '"/orders": ["admin", "operator", "family", "sponsor"]',
    );
  });

  test("exposes Orders only through the canonical route", async () => {
    expect(
      await Bun.file(
        new URL("../src/app/(dashboard)/orders/page.tsx", import.meta.url),
      ).exists(),
    ).toBe(true);
    expect(
      await Bun.file(
        new URL("../src/app/(dashboard)/family/orders/page.tsx", import.meta.url),
      ).exists(),
    ).toBe(false);
    expect(
      await Bun.file(
        new URL("../src/app/(dashboard)/operator/orders/page.tsx", import.meta.url),
      ).exists(),
    ).toBe(false);
    expect(
      await Bun.file(
        new URL("../src/app/(dashboard)/sponsor/orders/page.tsx", import.meta.url),
      ).exists(),
    ).toBe(false);
  });

  test("keeps each role overview exact while matching nested destination routes", () => {
    const navigation = getDashboardNavigation("operator", ((key: string) => key) as never);
    const overview = navigation.find((item) => item.id === "/dashboard");
    const families = navigation.find((item) => item.id === "/operator/families");
    const products = navigation.find((item) => item.id === "/products");

    expect(overview && isDashboardNavigationActive(overview, "/dashboard")).toBe(true);
    expect(overview && isDashboardNavigationActive(overview, "/operator/families")).toBe(false);
    expect(families && isDashboardNavigationActive(families, "/operator/families/record-1")).toBe(true);
    expect(products && isDashboardNavigationActive(products, "/products")).toBe(true);
    expect(products && isDashboardNavigationActive(products, "/products/123")).toBe(true);
  });

  test("keeps independent role dashboard query caches", () => {
    expect(dashboardKeys.admin).toEqual(["dashboard", "operator"]);
    expect(dashboardKeys.family).toEqual(["dashboard", "family"]);
    expect(sponsorDashboardKeys.overview).toEqual(["sponsor-dashboard", "overview"]);
  });

  test("ships dashboard and refunded-status labels in every supported language", () => {
    for (const language of ["en", "fr", "ar", "es"] as const) {
      expect(getUiTranslation(language, "dashboard.operator.title")).toBeTruthy();
      expect(getUiTranslation(language, "dashboard.operator.latestOrders")).toBeTruthy();
      expect(getUiTranslation(language, "dashboard.operator.operationalAttention")).toBeTruthy();
      expect(getUiTranslation(language, "dashboard.operator.quickActions")).toBeTruthy();
      expect(getUiTranslation(language, "dashboard.operator.calendar")).toBeTruthy();
      expect(getUiTranslation(language, "dashboard.family.spendingTrend")).toBeTruthy();
      expect(getUiTranslation(language, "dashboard.sponsor.contributionTrend")).toBeTruthy();
      for (const key of [
        "dashboard.sponsor.supportedOrders",
        "dashboard.sponsor.privacySafeOrders",
        "dashboard.sponsor.items",
        "dashboard.sponsor.noSupportedOrders",
      ] as const) {
        expect(getUiTranslation(language, key)).not.toBe(key);
      }
      expect(getUiTranslation(language, "status.refunded")).toBeTruthy();
    }
    expect(formatStatusLabel("refunded", "fr")).toBe("Remboursée");
  });

  test("adds live operator order, attention, and quick-action cards beside the pipeline", async () => {
    const pageSource = await Bun.file(
      new URL("../src/features/Dashboard/AdminDashboard/components/AdminDashboardPage.tsx", import.meta.url),
    ).text();
    const cardsSource = await Bun.file(
      new URL("../src/features/Dashboard/AdminDashboard/components/AdminOperationsCards.tsx", import.meta.url),
    ).text();
    const chartsSource = await Bun.file(
      new URL("../src/features/Dashboard/shared/DashboardCharts.tsx", import.meta.url),
    ).text();

    expect(pageSource).toContain('xlCols={12}');
    expect(pageSource).toContain('<LatestOrdersCard recentOrders={data.recentOrders ?? []} />');
    expect(pageSource).toContain("<OperationalAttentionCard");
    expect(pageSource).toContain("<QuickActionsCard />");
    expect(pageSource).not.toContain("<CalendarCard />");
    expect(pageSource).toContain('status !== "purchased"');
    expect(pageSource).toContain('xlOnlyStatuses={["approved"]}');
    expect(chartsSource).toContain('className="min-w-0 overflow-hidden pb-1"');
    expect(chartsSource).toContain("grid-cols-12");
    expect(chartsSource).toContain("h-44 min-w-0");
    expect(chartsSource).not.toContain("overflow-x-auto");
    expect(chartsSource).not.toContain("min-w-[42rem]");
    expect(cardsSource).toContain('href="/orders"');
    expect(cardsSource).toContain('href="/orders"');
    expect(cardsSource).toContain('href: "/contribution"');
    expect(cardsSource).toContain('href: "/products"');
  });

  test("shows the dominant category image in family recent orders", async () => {
    const pageSource = await Bun.file(
      new URL("../src/features/Dashboard/FamilyDashboard/components/FamilyDashboardPage.tsx", import.meta.url),
    ).text();

    expect(pageSource).toContain("order.dominantCategoryImage");
    expect(pageSource).toContain("order.dominantCategoryName");
    expect(pageSource).toContain('<ProtectedImage');
    expect(pageSource).toContain('sizes="48px"');
    expect(pageSource).toContain(
      '<NCard className="h-full" icon={ClipboardCheck} title={t("dashboard.family.recentOrders")}>',
    );
  });

  test("shows recent active sponsors on the family dashboard", async () => {
    const pageSource = await Bun.file(
      new URL("../src/features/Dashboard/FamilyDashboard/components/FamilyDashboardPage.tsx", import.meta.url),
    ).text();

    expect(pageSource).toContain('title={t("dashboard.family.recentSponsors")}');
    expect(pageSource).toContain("data.recentSponsorContributions");
    expect(pageSource).toContain("getSponsorPersonImage");
    expect(pageSource).toContain("fallbackSrc={getSponsorPersonImage(contribution.gender)}");
    expect(pageSource).toContain("getStatusTextColor(contribution.status)");
    expect(pageSource).toContain("+{money(contribution.amountMinor)}");
    expect(pageSource).not.toContain('title={contribution.name}');
  });

  test("renders one exact-role dashboard at the canonical route without redirecting", async () => {
    const routeSource = await Bun.file(
      new URL("../src/app/(dashboard)/dashboard/page.tsx", import.meta.url),
    ).text();

    expect(routeSource).toContain('case "admin"');
    expect(routeSource).toContain('case "family"');
    expect(routeSource).toContain('case "sponsor"');
    expect(routeSource).toContain("<AdminDashboardPage />");
    expect(routeSource).toContain("<FamilyDashboardPage />");
    expect(routeSource).toContain("<SponsorDashboardGate />");
    expect(routeSource).not.toContain("redirect(");
  });
});
