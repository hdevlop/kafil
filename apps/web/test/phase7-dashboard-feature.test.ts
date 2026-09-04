import { describe, expect, test } from "bun:test";

import { dashboardKeys } from "../src/features/Dashboard/shared/dashboardKeys";
import { sponsorDashboardKeys } from "../src/features/Dashboard/SponsorDashboard/hooks/sponsorDashboardKeys";
import {
  ACTIVE_ORDER_PIPELINE_STAGES,
  retainOrderPipelineStages,
} from "../src/features/Dashboard/shared/orderPipeline";
import { kafilUiI18n } from "@kafil/server/locales";

const getUiTranslation = kafilUiI18n.translate;
import { formatStatusLabel } from "../src/features/StatusLabels";
import {
  getDashboardNavigation,
  isDashboardNavigationActive,
} from "../src/shared/DashboardShell";

describe("Phase 7 dashboard presentation contracts", () => {
  test("retains every active order pipeline stage when counts are zero", () => {
    const result = retainOrderPipelineStages([
      { status: "pending", count: 2 },
      { status: "rejected", count: 1 },
    ]);

    expect(result.slice(0, ACTIVE_ORDER_PIPELINE_STAGES.length)).toEqual([
      { status: "pending", count: 2 },
      { status: "approved", count: 0 },
      { status: "in_preparation", count: 0 },
      { status: "purchased", count: 0 },
      { status: "out_for_delivery", count: 0 },
      { status: "delivered", count: 0 },
    ]);
    expect(result.at(-1)).toEqual({ status: "rejected", count: 1 });
  });

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

  test("filtering the nav table reproduces each role's ordering and headings", () => {
    // The single nav table is filtered per role, so ordering and section runs
    // are derived rather than hand-written. Admin and sponsor are the two ends
    // of that derivation: the longest list, and the one that merges every
    // destination into a single section.
    expect(
      getDashboardNavigation("admin").flatMap((item) =>
        item.href
          ? [item.href]
          : (item.children ?? []).flatMap((child) =>
              child.href ? [child.href] : [],
            ),
      ),
    ).toEqual([
      "/dashboard",
      "/family",
      "/children",
      "/sponsors",
      "/staff",
      "/applicants",
      "/contribution",
      "/assignments",
      "/categories",
      "/products",
      "/orders",
      "/users",
      "/roles",
      "/permissions",
    ]);
    expect(
      getDashboardNavigation("admin")
        .filter((item) => item.sectionLabel)
        .map((item) => item.sectionLabel),
    ).toEqual([
      "nav.supportOperations",
      "nav.finance",
      "nav.catalogOperations",
      "nav.settings",
    ]);

    const adminGroups = getDashboardNavigation("admin").filter(
      (item) => item.children,
    );
    expect(adminGroups.map((item) => item.label)).toEqual([
      "nav.accessManagement",
      "nav.theme",
    ]);
    expect(adminGroups.map((item) => item.children?.map((child) => child.id))).toEqual([
      ["/users", "/roles", "/permissions"],
      ["settings:theme", "settings:branding"],
    ]);

    expect(getDashboardNavigation("sponsor").map((item) => item.href)).toEqual([
      "/dashboard",
      "/family",
      "/contribution",
      "/orders",
    ]);
    expect(
      getDashboardNavigation("sponsor")
        .filter((item) => item.sectionLabel)
        .map((item) => item.sectionLabel),
    ).toEqual(["nav.supportAndFinance"]);

    expect(getDashboardNavigation(null)).toEqual([]);
  });

  test("uses flat icon-backed operator destinations with native sidebar sections", () => {
    const navigation = getDashboardNavigation("operator");

    expect(navigation.map((item) => item.id)).toEqual([
      "/dashboard",
      "/family",
      "/children",
      "/sponsors",
      "/contribution",
      "/assignments",
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
    const navigation = getDashboardNavigation("family");

    expect(navigation.map((item) => item.id)).toEqual([
      "/dashboard",
      "/children",
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
      const navigation = getDashboardNavigation(role);
      expect(navigation.some((item) => item.href?.includes("budget"))).toBe(
        false,
      );
    }
  });

  test("routes sponsor Orders through the same canonical surface", async () => {
    const navigation = getDashboardNavigation("sponsor");
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
    const navigation = getDashboardNavigation("operator");
    const overview = navigation.find((item) => item.id === "/dashboard");
    const families = navigation.find((item) => item.id === "/family");
    const products = navigation.find((item) => item.id === "/products");

    expect(overview && isDashboardNavigationActive(overview, "/dashboard")).toBe(true);
    expect(overview && isDashboardNavigationActive(overview, "/family")).toBe(false);
    expect(families && isDashboardNavigationActive(families, "/family")).toBe(true);
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
    const latestOrdersSource = await Bun.file(
      new URL("../src/features/Dashboard/AdminDashboard/components/LatestOrdersCard.tsx", import.meta.url),
    ).text();
    const attentionSource = await Bun.file(
      new URL("../src/features/Dashboard/AdminDashboard/components/AttentionCard.tsx", import.meta.url),
    ).text();
    const quickActionsSource = await Bun.file(
      new URL("../src/features/Dashboard/AdminDashboard/components/QuickActionsCard.tsx", import.meta.url),
    ).text();
    const sponsorChartSource = await Bun.file(
      new URL("../src/features/Sponsors/components/overview/ContributionOverviewCard.tsx", import.meta.url),
    ).text();
    const skeletonSource = await Bun.file(
      new URL("../src/features/Dashboard/shared/DashboardSkeletons.tsx", import.meta.url),
    ).text();

    expect(pageSource).toContain('xlCols={12}');
    expect(pageSource).toContain('<LatestOrdersCard recentOrders={data.recentOrders ?? []} />');
    expect(pageSource).toContain("<AttentionCard");
    expect(pageSource).toContain("<QuickActionsCard />");
    expect(pageSource).not.toContain("<CalendarCard />");
    expect(pageSource).toContain('status !== "purchased"');
    expect(pageSource).toContain('className: "hidden xl:block"');
    expect(pageSource).toContain("NLineChart");
    expect(pageSource).toContain("NPieChart");
    expect(pageSource).toContain("NStatusBreakdown");
    expect(pageSource).not.toContain("MonthlyLineChart");
    expect(pageSource).not.toContain("#55A7EE");
    expect(sponsorChartSource).toContain("NLineChart");
    expect(sponsorChartSource).not.toContain("<svg");
    expect(skeletonSource).toContain("NChartSkeleton");
    expect(skeletonSource).toContain("NStatCardSkeleton");
    expect(latestOrdersSource).toContain('href="/orders"');
    expect(attentionSource).toContain('href: "/orders"');
    expect(attentionSource).toContain('href: "/contribution"');
    expect(attentionSource).toContain('href: "/applicants"');
    expect(attentionSource).toContain('awaitingApplicantReview');
    expect(attentionSource).toContain('href: "/operator/families"');
    expect(attentionSource).toContain('awaitingSponsorship');
    expect(attentionSource).toContain('allClear');
    expect(attentionSource).not.toContain('.filter((item) => item.count > 0)');
    expect(quickActionsSource).toContain('href: "/products"');
    expect(quickActionsSource).toContain('href: "/applicants"');
    expect(quickActionsSource).toContain('reviewApplicants');
  });

  test("shows the dominant category image in family recent orders", async () => {
    const pageSource = await Bun.file(
      new URL("../src/features/Dashboard/FamilyDashboard/components/FamilyDashboardPage.tsx", import.meta.url),
    ).text();

    expect(pageSource).toContain("order.dominantCategoryImage");
    expect(pageSource).toContain("order.dominantCategoryName");
    expect(pageSource).toContain('<NNextImage');
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
    expect(pageSource).toContain('fallbackSrc={getPersonImage({ image: null, role: "adult", gender: contribution.gender })}');
    expect(pageSource).toContain("statusTextClass(contribution.status)");
    expect(pageSource).toContain("+{money(contribution.amountMinor)}");
    expect(pageSource).not.toContain('title={contribution.name}');
    expect(pageSource).toContain('icon={HandHeart}');
    expect(pageSource).toContain('icon={ShoppingBag}');
    expect(pageSource).not.toContain('<p className="py-10 text-center text-sm text-muted-foreground">');
  });

  test("uses icon-backed feedback states for empty dashboard and overview cards", async () => {
    const sources = await Promise.all([
      "../src/features/Dashboard/AdminDashboard/components/LatestOrdersCard.tsx",
      "../src/features/Dashboard/SponsorDashboard/components/UpcomingContributionsCard.tsx",
      "../src/features/Sponsors/components/overview/RecentSupportedOrdersCard.tsx",
      "../src/features/Sponsors/components/overview/RecentContributionsCard.tsx",
    ].map((path) => Bun.file(new URL(path, import.meta.url)).text()));

    for (const source of sources) {
      expect(source).toContain("<NEmptyState");
      expect(source).toContain("icon={");
      expect(source).not.toContain("emptyText=");
    }
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
