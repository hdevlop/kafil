import { describe, expect, test } from "bun:test";

import { familyCatalogKeys } from "../src/features/FamilyCatalog/hooks/familyCatalogKeys";

describe("Phase 6E family catalog query contracts", () => {
  test("keeps family category lookup separate from active product browsing", () => {
    expect(familyCatalogKeys.categories).toEqual(["family-catalog", "categories"]);
    expect(
      familyCatalogKeys.products({
        categoryId: "11111111-1111-4111-8111-111111111111",
        limit: 12,
        offset: 24,
        search: "  rice  ",
      }),
    ).toEqual([
      "family-catalog",
      "list",
      {
        categoryId: "11111111-1111-4111-8111-111111111111",
        limit: 12,
        offset: 24,
        search: "rice",
      },
    ]);
  });

  test("omits empty filters from the active product cache key", () => {
    expect(
      familyCatalogKeys.products({
        limit: 12,
        offset: 0,
        search: "   ",
      }),
    ).toEqual(["family-catalog", "list", { limit: 12, offset: 0 }]);
  });
});
