import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const ntableCardFiles = [
  "../src/features/Budgets/components/BudgetLedgerCard.tsx",
  "../src/features/Categories/components/CategoryCard.tsx",
  "../src/features/Children/components/ChildCard.tsx",
  "../src/features/Contributions/components/ContributionCard.tsx",
  "../src/features/Families/components/FamilyCard.tsx",
  "../src/features/FamilyBudget/components/FamilyBudgetLedgerCard.tsx",
  "../src/features/Orders/components/OrderCard.tsx",
  "../src/features/Products/components/ProductCard.tsx",
  "../src/features/Sponsors/components/SponsorCard.tsx",
  "../src/features/SupportAssignments/components/SupportAssignmentCard.tsx",
] as const;

function readSource(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

describe("NTable responsive card layouts", () => {
  test("category filter sheet reuses NTable cards with category images", () => {
    const categorySheet = readSource(
      "../src/features/Categories/components/CategoryBar.tsx",
    );
    expect(categorySheet).toContain("<NTable<CategoryBarItem>");
    expect(categorySheet).toContain("<CategoryCard compact data={data} />");
    expect(categorySheet).toContain('availableModes={["cards"]}');
    expect(categorySheet).toContain('classNames={{ cards: "grid grid-cols-3 gap-2" }}');
    expect(categorySheet).toContain("width={420}");
    expect(categorySheet).toContain('aria-pressed={activeId === data.id}');
    expect(categorySheet).toContain('select(activeId === data.id ? "" : data.id)');
    expect(categorySheet).not.toContain("CategoryOption");

    const categoryCard = readSource(
      "../src/features/Categories/components/CategoryCard.tsx",
    );
    expect(categoryCard).toContain('"relative aspect-square w-full overflow-hidden"');
    expect(categoryCard).toContain('sizes="120px"');
  });

  test("catalog card pages use pagination appropriate to their data source", () => {
    const categories = readSource(
      "../src/features/Categories/components/CategoriesPage.tsx",
    );
    expect(categories).toContain("createOffsetPagination(0, 100)");
    expect(categories).toContain("showPagination: false");
    expect(categories).not.toContain("manualPagination: true");

    const products = readSource(
      "../src/features/Products/components/ProductsPage.tsx",
    );
    expect(products).toContain("managementPagination = createOffsetPagination(0, 100)");
    expect(products).toContain("familyPagination = createOffsetPagination(0, 12)");
    expect(products).toContain("manualPagination: true");
    expect(products).toContain("pageSizeOptions: [25, 50, 100]");
    expect(products.match(/xl:grid-cols-8/g)).toHaveLength(2);
  });

  test("all renderers use the embedded NCard information contract", () => {
    expect(ntableCardFiles).toHaveLength(10);

    for (const relativePath of ntableCardFiles) {
      const source = readSource(relativePath);
      expect(source).toContain("<NCard");
      expect(source).not.toContain("NSectionInfo");
      expect(source).not.toContain("<article");
      expect(source).toMatch(/<NCard[^>]*(\bembedded\b|\bbordered\b)/);

      if (!relativePath.includes("/Categories/")) {
        expect(source).toContain("<NCardInfo");
      }
    }
  });

  test("entity cards use responsive media variants", () => {
    const family = readSource("../src/features/Families/components/FamilyCard.tsx");
    expect(family).toContain('<NCardMedia variant="image" size={104}>');
    expect(family).toContain('className="space-y-3 px-3 pb-3 sm:px-4 sm:pb-4"');
    expect(family).toContain("<FundingProgressBar inline progress={data.funding} />");

    for (const relativePath of [
      "../src/features/Budgets/components/BudgetLedgerCard.tsx",
      "../src/features/SupportAssignments/components/SupportAssignmentCard.tsx",
    ]) {
      expect(readSource(relativePath)).toContain('<NCardMedia variant="avatar" size="sm">');
    }

    const category = readSource("../src/features/Categories/components/CategoryCard.tsx");
    expect(category).toContain('variant="hero"');
    expect(category).toContain('aspect="square"');
    expect(category).toContain("mx-3 mt-3 w-[calc(100%-1.5rem)] rounded-xl bg-muted");
    expect(category).toContain('className="size-full object-contain"');
    expect(category).toContain('className="size-full object-cover"');
    expect(category).toContain("<NCardSection");
    expect(category).toContain('surface="plain"');
    expect(category).not.toContain("<NCardFooter>");
    expect(category).not.toContain("<NCardInfo");
    expect(category).toContain("{data.name}");
    expect(category).not.toContain("{data.slug}");
    expect(category).not.toContain("entityCardImageColor");
    expect(category).toContain("data.itemCount");
    expect(category).not.toContain("<StatusBadge");

    const product = readSource("../src/features/Products/components/ProductCard.tsx");
    expect(product).toContain('variant="hero"');
    expect(product).toContain('aspect="square"');
    expect(product).toContain('style={{ aspectRatio: "1 / 1" }}');
    expect(product).toContain("mx-2.5 mt-2.5 w-[calc(100%-1.25rem)] rounded-lg bg-muted");
    expect(product).toContain('className="size-full object-contain"');
    expect(product).not.toContain("entityCardImageColor");
    expect(product).toContain("{data.name}");
    expect(product).toContain("formatMad(data.priceMinor)");
    expect(product).toContain("text-emerald-600");
    expect(product).not.toContain("<StatusBadge");
    expect(product).toContain("data.categoryName");
    expect(product).not.toContain("data.onHandQuantity");
    expect(product).not.toContain("<NCardFooter>");
    expect(product).toContain("<NCardInfo");
    expect(product).toContain("maxChars={18}");
    expect(product).toContain("<NCardSection");
    expect(product).toContain("embedded");
    expect(product).toContain("title={data.name}");
    expect(product).toContain("description={formatMad(data.priceMinor)}");
    expect(product).not.toContain("mix-blend-multiply");

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
