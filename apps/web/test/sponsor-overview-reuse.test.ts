import { describe, expect, test } from "bun:test";

import { sponsorDashboardKeys } from "../src/features/Dashboard/SponsorDashboard/hooks/sponsorDashboardKeys";
import { sponsorKeys } from "../src/features/Sponsors/hooks/sponsorKeys";

describe("Sponsor overview shared-card reuse contracts", () => {
  test("the sponsor dashboard page imports shared overview cards from Sponsors, not local duplicates", async () => {
    const pageSource = await Bun.file(
      new URL("../src/features/Dashboard/SponsorDashboard/components/SponsorDashboardPage.tsx", import.meta.url),
    ).text();

    expect(pageSource).toContain("@/features/Sponsors/components/overview/SponsorKpiGrid");
    expect(pageSource).toContain("@/features/Sponsors/components/overview/SupportBudgetCard");
    expect(pageSource).toContain("@/features/Sponsors/components/overview/ContributionOverviewCard");
    expect(pageSource).toContain("@/features/Sponsors/components/overview/RecentContributionsCard");
    expect(pageSource).toContain("@/features/Sponsors/components/overview/RecentSupportedOrdersCard");
    expect(pageSource).toContain("<SponsorKpiGrid desktopColumns={5}");
    expect(pageSource).toContain("xl:h-full xl:min-h-0");
    expect(pageSource).toContain("xl:grid-rows-[auto_minmax(0,1fr)]");
    expect(pageSource).not.toContain("xl:auto-rows-fr");
    expect(pageSource).toContain('import Link from "next/link"');
    expect(pageSource).not.toContain("<a");
  });

  test("the shared contribution activity card uses the published Najm chart", async () => {
    const source = await Bun.file(
      new URL("../src/features/Sponsors/components/overview/ContributionOverviewCard.tsx", import.meta.url),
    ).text();

    expect(source).toMatch(/import \{[^}]*\bNLineChart\b[^}]*\} from "najm-kit"/);
    expect(source).toContain("<NLineChart");
    expect(source).toContain("toChartData");
    expect(source).not.toContain("<svg");
  });

  test("shared cards contain no hardcoded sponsor-self routes", async () => {
    const componentFiles = [
      "SponsorKpiGrid",
      "SupportBudgetCard",
      "ContributionOverviewCard",
      "RecentContributionsCard",
      "RecentSupportedOrdersCard",
    ];

    for (const fileName of componentFiles) {
      const source = await Bun.file(
        new URL(`../src/features/Sponsors/components/overview/${fileName}.tsx`, import.meta.url),
      ).text();
      expect(source).not.toContain("/sponsor/");
    }
  });

  test("operator dialog imports shared cards via direct imports from Sponsors overview", async () => {
    const source = await Bun.file(
      new URL("../src/features/Sponsors/components/SponsorOverviewDialogContent.tsx", import.meta.url),
    ).text();

    expect(source).toContain("@/features/Sponsors/components/overview/");
    expect(source).toContain('<SponsorKpiGrid desktopColumns={4} kpis={vm.kpis} variant="compact" />');
    expect(source).not.toContain("@/features/SponsorOverview");
  });

  test("sponsor rows and cards open the sponsor overview when clicked", async () => {
    const source = await Bun.file(
      new URL("../src/features/Sponsors/components/SponsorsPage.tsx", import.meta.url),
    ).text();

    expect(source).toContain("onRowClick: openView");
    expect(source).toContain("onView: openView");
  });

  test("the shared KPI grid supports Najm Kit compact stat cards without losing dashboard defaults", async () => {
    const source = await Bun.file(
      new URL("../src/features/Sponsors/components/overview/SponsorKpiGrid.tsx", import.meta.url),
    ).text();

    expect(source).toContain('variant?: "default" | "compact"');
    expect(source).toContain('variant = "default"');
    expect(source).toContain('variant: "compact" as const');
  });

  test("query keys isolate overview data by sponsor ID", () => {
    expect(sponsorDashboardKeys.overview).toEqual(["sponsor-dashboard", "overview"]);
    expect(sponsorKeys.overview("abc")).toEqual(["sponsors", "detail", "abc", "overview"]);
  });
});
