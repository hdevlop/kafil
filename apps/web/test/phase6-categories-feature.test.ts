import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

import {
  categoryStatusFormSchema,
  createCategoryFormSchema,
  toCategoryStatusInput,
  toCreateCategoryInput,
  toUpdateCategoryInput,
  updateCategoryFormSchema,
} from "../src/features/Categories/config/categorySchemas";
import { categoryKeys } from "../src/features/Categories/hooks/categoryKeys";

const categoriesPage = readFileSync(
  new URL("../src/features/Categories/components/CategoriesPage.tsx", import.meta.url),
  "utf8",
);

describe("Phase 6D category form contracts", () => {
  test("creates a catalog category without client-controlled status and auto-derives slug from name", () => {
    const values = createCategoryFormSchema.parse({
      name: "  Food essentials  ",
      description: "  Staples for household orders  ",
      sortOrder: "10",
    });

    const input = toCreateCategoryInput(values);

    expect(input).toEqual({
      name: "Food essentials",
      slug: "food-essentials",
      description: "Staples for household orders",
      image: null,
      sortOrder: 10,
    });
    expect(input).not.toHaveProperty("status");
  });

  test("rejects an invalid display order", () => {
    expect(
      createCategoryFormSchema.safeParse({
        name: "Food",
        description: "",
        sortOrder: -1,
      }).success,
    ).toBe(false);
  });

  test("updates catalog fields and auto-derives slug from name", () => {
    const values = updateCategoryFormSchema.parse({
      name: "Food essentials",
      description: "   ",
      sortOrder: 0,
    });

    expect(toUpdateCategoryInput(values)).toEqual({
      name: "Food essentials",
      slug: "food-essentials",
      description: null,
      image: null,
      sortOrder: 0,
    });
  });
});

describe("Phase 6D category lifecycle contracts", () => {
  test("requires an audited reason for activation changes", () => {
    expect(categoryStatusFormSchema.safeParse({ reason: "" }).success).toBe(false);
    const values = categoryStatusFormSchema.parse({ reason: "  Seasonal catalog review  " });
    expect(toCategoryStatusInput("category-1", values)).toEqual({
      id: "category-1",
      reason: "Seasonal catalog review",
    });
  });

  test("keeps stable category list and detail query keys", () => {
    expect(categoryKeys.list({ limit: 25, offset: 50 })).toEqual([
      "categories",
      "list",
      { limit: 25, offset: 50 },
    ]);
    expect(categoryKeys.detail("category-1")).toEqual([
      "categories",
      "detail",
      "category-1",
    ]);
  });

  test("opens the filtered products page when a category card is clicked", () => {
    expect(categoriesPage).toContain("onRowClick: (category) =>");
    expect(categoriesPage).toContain(
      "router.push(`/products?category=${encodeURIComponent(category.id)}`)",
    );
  });
});
