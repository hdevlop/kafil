import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";

const ntableCardFiles = [
  "../src/features/Applicants/components/ApplicantCard.tsx",
  "../src/features/Categories/components/CategoryCard.tsx",
  "../src/features/Children/components/ChildCard.tsx",
  "../src/features/Contributions/components/ContributionCard.tsx",
  "../src/features/Families/components/FamilyCard/FamilyCard.tsx",
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
    expect(categorySheet).toContain('aria-label={filterLabel}');
    expect(categorySheet).toContain('className="hidden sm:inline"');
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

  test("catalog card pages use server pages with responsive Load more controls", () => {
    const categories = readSource(
      "../src/features/Categories/components/CategoriesPage.tsx",
    );
    expect(categories).toContain("createOffsetPagination(0, 25)");
    expect(categories).toContain("showPagination: true");
    expect(categories).toContain("manualPagination: true");
    expect(categories).toContain("createCardPagination(workspace.paginationController, t)");

    const products = readSource(
      "../src/features/Products/components/ProductsPage.tsx",
    );
    expect(products).toContain("productsPagination = createOffsetPagination(0, 25)");
    expect(products).toContain("showPagination: true");
    expect(products).toContain("manualPagination: true");
    expect(products).toContain("createCardPagination(workspace.paginationController, t)");
    expect(products).not.toContain('className="hidden justify-between sm:flex"');
    expect(products.match(/xl:grid-cols-6/g)).toHaveLength(1);
    expect(products.match(/2xl:grid-cols-8/g)).toHaveLength(1);
    expect(products).not.toContain("ProductsFamilyGrid");
    expect(categories).not.toContain("CategoriesFamilyGrid");
  });

  test("all renderers use the embedded NCard information contract", () => {
    expect(ntableCardFiles).toHaveLength(9);

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

test("role-scoped data reuses the shared catalog, order, and contribution components", () => {
    const orders = readSource(
      "../src/features/Orders/components/OrdersPage.tsx",
    );
    expect(orders).not.toContain("familyTableProps");
    expect(orders).not.toContain("sponsorTableProps");
    expect(orders).not.toContain("operatorTableProps");
    expect(orders).not.toContain("audience=");
    expect(orders).toContain("tableProps: NTableProps<SharedOrderRecord>");
    expect(orders).not.toContain("function FamilyOrderCard");
    expect(
      existsSync(
        new URL(
          "../src/features/SponsorWorkspace",
          import.meta.url,
        ),
      ),
    ).toBe(false);
    expect(
      existsSync(
        new URL(
          "../src/features/SponsorOverview",
          import.meta.url,
        ),
      ),
    ).toBe(false);
    expect(
      existsSync(
        new URL(
          "../src/features/SponsorProfile",
          import.meta.url,
        ),
      ),
    ).toBe(false);
    for (const removedFeature of [
      "FamilyBudget",
      "FamilyCatalog",
      "FamilyOrdering",
    ]) {
      expect(
        existsSync(
          new URL(`../src/features/${removedFeature}`, import.meta.url),
        ),
      ).toBe(false);
    }
  });

  test("entity cards use responsive media variants", () => {
    const family = readSource(
      "../src/features/Families/components/FamilyCard/FamilyCard.tsx",
    );
    expect(family).toContain('<NCardMedia variant="image" size={104}>');
    expect(family).toContain('className="space-y-3 px-3 pb-3 sm:px-4 sm:pb-4"');
    expect(family).toContain("<FundingProgressBar inline progress={data.funding} />");

    expect(
      readSource(
        "../src/features/SupportAssignments/components/SupportAssignmentCard.tsx",
      ),
    ).toContain('<NCardMedia variant="avatar" size="sm">');

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
    expect(product).toContain("fmt.money(data.priceMinor)");
    expect(product).toContain('title: "text-sm font-semibold leading-tight text-foreground"');
    expect(product).toContain('"mt-1 text-base font-bold leading-none');
    expect(product).toContain("text-emerald-600");
    expect(product).not.toContain("<StatusBadge");
    expect(product).toContain("data.categoryName");
    expect(product).not.toContain("data.onHandQuantity");
    expect(product).not.toContain("<NCardFooter>");
    expect(product).toContain("<NCardInfo");
    expect(product).toContain("maxChars={18}");
    expect(product).toContain('t("family.orderCart.inCart"');
    expect(product).toContain('variant={hasCartItem ? "soft" : "success"}');
    expect(product).toContain("fullWidth");
    expect(product).not.toContain("function decrement");
    expect(product).not.toContain("function increment");
    expect(product).not.toContain("ORDER_CART_MAX_QUANTITY");
    expect(product).toContain("<NCardSection");
    expect(product).toContain("embedded");
    expect(product).toContain("title={data.name}");
    expect(product).toContain("description={fmt.money(data.priceMinor)}");
    expect(product).not.toContain("mix-blend-multiply");

    const child = readSource("../src/features/Children/components/ChildCard.tsx");
    expect(child).toContain('variant="avatar"');
    expect(child).not.toContain('placement="side"');
    expect(child).toContain('size="sm"');
    expect(child).toContain("title={data.legalName}");
    expect(child).not.toContain("<NCardAction>");
    expect(child).not.toContain("<StatusBadge");
    expect(child).toContain('density="responsive" surface="responsive"');
    expect(child).toContain('description: "hidden sm:block"');
    expect(child).toContain('header: "[&>div:last-child]:hidden sm:[&>div:last-child]:flex"');
    expect(child).toContain('avatar: "size-20 bg-muted sm:size-16"');

    const sponsor = readSource("../src/features/Sponsors/components/SponsorCard.tsx");
    expect(sponsor).toContain('variant="avatar"');
    expect(sponsor).not.toContain('placement="side"');
    expect(sponsor).toContain('size="sm"');
    expect(sponsor).toContain("title={data.name}");
    expect(sponsor).not.toContain("<NCardAction>");
    expect(sponsor).not.toContain("<StatusBadge");
    expect(sponsor).toContain('density="responsive" surface="responsive"');
    expect(sponsor).toContain('description: "hidden sm:block"');
    expect(sponsor).toContain('header: "[&>div:last-child]:hidden sm:[&>div:last-child]:flex"');
    expect(sponsor).toContain('avatar: "size-20 bg-muted sm:size-16"');
  });
});
