import { describe, expect, test } from "bun:test";

import { sponsorDashboardKeys } from "../src/features/SponsorDashboard/hooks/sponsorDashboardKeys";
import { sponsorKeys } from "../src/features/Sponsors/hooks/sponsorKeys";

describe("Sponsor overview shared-card reuse contracts", () => {
  test("the sponsor dashboard page imports shared SponsorOverview cards, not local duplicates", async () => {
    const pageSource = await Bun.file(
      new URL("../src/features/SponsorDashboard/components/SponsorDashboardPage.tsx", import.meta.url),
    ).text();

    expect(pageSource).toContain("@/features/SponsorOverview/components/SponsorKpiGrid");
    expect(pageSource).toContain("@/features/SponsorOverview/components/SupportBudgetCard");
    expect(pageSource).toContain("@/features/SponsorOverview/components/ContributionOverviewCard");
    expect(pageSource).toContain("@/features/SponsorOverview/components/RecentContributionsCard");
    expect(pageSource).toContain("@/features/SponsorOverview/components/RecentSupportedOrdersCard");
    expect(pageSource).toContain('import Link from "next/link"');
    expect(pageSource).not.toContain("<a");
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
        new URL(`../src/features/SponsorOverview/components/${fileName}.tsx`, import.meta.url),
      ).text();
      expect(source).not.toContain("/sponsor/");
    }
  });

  test("operator dialog imports shared cards via direct imports, not barrel", async () => {
    const source = await Bun.file(
      new URL("../src/features/Sponsors/components/SponsorOverviewDialogContent.tsx", import.meta.url),
    ).text();

    expect(source).toContain("@/features/SponsorOverview/components/");
    expect(source).not.toContain('from "@/features/SponsorOverview"');
  });

  test("query keys isolate overview data by sponsor ID", () => {
    expect(sponsorDashboardKeys.overview).toEqual(["sponsor-dashboard", "overview"]);
    expect(sponsorKeys.overview("abc")).toEqual(["sponsors", "detail", "abc", "overview"]);
  });
});
