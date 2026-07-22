import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const ntableCardFiles = [
  "../src/features/Budgets/components/BudgetLedgerCard.tsx",
  "../src/features/Categories/components/CategoryCard.tsx",
  "../src/features/Children/components/ChildCard.tsx",
  "../src/features/Contributions/components/ContributionCard.tsx",
  "../src/features/Families/components/FamilyCard.tsx",
  "../src/features/FamilyBudget/components/FamilyBudgetLedgerCard.tsx",
  "../src/features/Inventory/components/InventoryLedgerCard.tsx",
  "../src/features/Orders/components/OrderCard.tsx",
  "../src/features/Products/components/ProductCard.tsx",
  "../src/features/Sponsors/components/SponsorCard.tsx",
  "../src/features/SupportAssignments/components/SupportAssignmentCard.tsx",
] as const;

function readSource(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

describe("NTable responsive card layouts", () => {
  test("all renderers use the embedded NCard information contract", () => {
    expect(ntableCardFiles).toHaveLength(11);

    for (const relativePath of ntableCardFiles) {
      const source = readSource(relativePath);
      expect(source).toContain("<NCard");
      expect(source).toContain("embedded");
      expect(source).toContain("<NCardSection");
      expect(source).toContain("<NCardInfo");
      expect(source).not.toContain("NSectionInfo");
      expect(source).not.toContain("<article");
    }
  });

  test("entity cards use responsive media variants", () => {
    const family = readSource("../src/features/Families/components/FamilyCard.tsx");
    expect(family).toContain('<NCardMedia variant="image" size={104}>');
    expect(family).toContain('className="space-y-3 px-3 pb-3 sm:px-4 sm:pb-4"');
    expect(family).toContain("<FundingProgressBar inline progress={data.funding} />");

    for (const relativePath of [
      "../src/features/Budgets/components/BudgetLedgerCard.tsx",
      "../src/features/Categories/components/CategoryCard.tsx",
      "../src/features/Products/components/ProductCard.tsx",
      "../src/features/SupportAssignments/components/SupportAssignmentCard.tsx",
    ]) {
      expect(readSource(relativePath)).toContain('<NCardMedia variant="avatar" size="sm">');
    }

    const child = readSource("../src/features/Children/components/ChildCard.tsx");
    expect(child).toContain('variant="avatar"');
    expect(child).not.toContain('placement="side"');
    expect(child).toContain('size="sm"');
    expect(child).toContain("title={data.legalName}");
    expect(child).toContain("<NCardAction>");
    expect(child).toContain('density="responsive" surface="responsive"');
    expect(child).toContain('description: "hidden sm:block"');
    expect(child).toContain('header: "[&>div:last-child]:hidden sm:[&>div:last-child]:flex"');
    expect(child).toContain('avatar: "size-20 bg-muted sm:size-16"');

    const sponsor = readSource("../src/features/Sponsors/components/SponsorCard.tsx");
    expect(sponsor).toContain('variant="avatar"');
    expect(sponsor).not.toContain('placement="side"');
    expect(sponsor).toContain('size="sm"');
    expect(sponsor).toContain("title={data.name}");
    expect(sponsor).toContain("<NCardAction>");
    expect(sponsor).toContain('density="responsive" surface="responsive"');
    expect(sponsor).toContain('description: "hidden sm:block"');
    expect(sponsor).toContain('header: "[&>div:last-child]:hidden sm:[&>div:last-child]:flex"');
    expect(sponsor).toContain('avatar: "size-20 bg-muted sm:size-16"');
  });
});
