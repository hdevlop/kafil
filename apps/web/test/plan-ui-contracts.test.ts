import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";

function source(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

describe("root PLAN shared UI contracts", () => {
  test("uses one canonical contribution surface with family-safe controls", () => {
    const page = source("../src/features/Contributions/components/ContributionsPage.tsx");
    const details = source("../src/features/Contributions/components/ContributionDetails.tsx");
    const operatorRoute = source("../src/app/(dashboard)/operator/contributions/page.tsx");

    expect(existsSync(new URL("../src/app/(dashboard)/contribution/page.tsx", import.meta.url))).toBe(true);
    expect(existsSync(new URL("../src/app/(dashboard)/family/contributions/page.tsx", import.meta.url))).toBe(false);
    expect(operatorRoute).toContain('redirect("/contribution")');
    expect(page).toContain('audience === "family"');
    expect(page).toContain("menu: { row: rowActions }");
    expect(page).toContain("menuButton: true");
    expect(page).not.toContain("<DropdownMenu");
    expect(page).not.toContain("<IconButton");
    expect(details).toContain("const management = isManagement(contribution)");
    expect(details).toContain("management ?");
    expect(page).not.toContain("<OnlySponsor>");
    expect(page).not.toContain("<SponsorContributionWorkspace");
    expect(page).toContain("useContributionsTableFilters(listFilters, setListFilters)");
  });

  test("keeps contribution pagination on populated pages while requests are in flight", () => {
    const page = source("../src/features/Contributions/components/ContributionsPage.tsx");
    const hooks = source("../src/features/Contributions/hooks/useContributions.ts");
    const api = source("../src/services/contributionApi.ts");

    expect(page).toContain("useContributionPage<ContributionListRecord>");
    expect(page).toContain("pagedContributions.data?.hasNextPage");
    expect(page).toContain("if (pagedContributions.isFetching) return;");
    expect(hooks).toContain("placeholderData: keepPreviousData");
    expect(api).toContain("offset: query.offset + query.limit");
  });

  test("sizes contribution pages to the available desktop table height", () => {
    const page = source("../src/features/Contributions/components/ContributionsPage.tsx");
    const sizing = source("../src/hooks/useAvailableTablePageSize.ts");

    expect(page).toContain("useAvailableTablePageSize((availablePageSize) =>");
    expect(page).toContain("ref={containerRef}");
    expect(page).toContain("createOffsetPagination(0, availablePageSize)");
    expect(sizing).toContain("new ResizeObserver(update)");
    expect(sizing).toContain("Math.floor((height - TABLE_CHROME_HEIGHT) / TABLE_ROW_HEIGHT)");
  });

  test("keeps one compact role-aware order card with category and delivery context", () => {
    const card = source("../src/features/Orders/components/OrderCard.tsx");
    const page = source("../src/features/Orders/components/OrdersPage.tsx");

    expect(card).not.toContain("audience");
    expect(card).toContain("useKafilRole");
    expect(card).toContain("<Operator>");
    expect(card).toContain("dominantCategoryImage");
    expect(card).toContain("dominantCategoryName");
    expect(card).toContain("deliveryName");
    expect(card).not.toContain('label="Source"');
    expect(page).not.toContain('audience="management"');
    expect(page).not.toContain('audience="family"');
    expect(page).not.toContain('audience="sponsor"');
    expect(page).toContain("sponsor={isExactSponsor}");
    expect(page).not.toContain("else if (!isExactSponsor)");
  });

  test("keeps create and edit actions aligned with exact role ownership", () => {
    const families = source(
      "../src/features/Families/hooks/useFamiliesTableProps.tsx",
    );
    const sponsorFamilies = source(
      "../src/features/Families/hooks/useSponsorFamiliesTableProps.tsx",
    );
    const children = source(
      "../src/features/Children/components/ChildrenPage.tsx",
    );

    expect(families).toContain("onCreate: openCreate");
    expect(sponsorFamilies).not.toContain("onCreate");
    expect(sponsorFamilies).not.toContain("onEdit");
    expect(children).toContain("onCreate: isExactFamily ? undefined : openCreate");
    expect(children).toContain("onEdit: isExactFamily ? undefined : openEdit");
  });

  test("orders exact family-directory authorization before its wildcard", () => {
    const auth = source("../src/lib/auth.ts");
    expect(auth.indexOf('"/family": ["admin", "operator", "sponsor"]')).toBeLessThan(
      auth.indexOf('"/family/:path*": ["family"]'),
    );
  });
});
