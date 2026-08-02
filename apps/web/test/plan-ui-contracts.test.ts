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
    expect(page).toContain("<NRowActions");
    expect(page).toContain("<IconButton");
    expect(page).toContain("<Operator>");
    expect(page).toContain("<Admin>");
    expect(details).toContain("const management = isManagement(contribution)");
    expect(details).toContain("{management ?");
  });

  test("keeps one compact audience-aware order card with category and delivery context", () => {
    const card = source("../src/features/Orders/components/OrderCard.tsx");
    const page = source("../src/features/Orders/components/OrdersPage.tsx");

    expect(card).toContain('audience === "family"');
    expect(card).toContain("dominantCategoryImage");
    expect(card).toContain("dominantCategoryName");
    expect(card).toContain("deliveryName");
    expect(card).not.toContain('label="Source"');
    expect(page).toContain('audience="management"');
    expect(page).toContain('audience="family"');
    expect(page).toContain('audience="sponsor"');
  });
});
