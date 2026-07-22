import { describe, expect, test } from "bun:test";

import {
  createProductFormSchema,
  productStatusFormSchema,
  toCreateProductInput,
  toProductStatusInput,
  toUpdateProductInput,
  updateProductFormSchema,
} from "../src/features/Products/config/productSchemas";
import { productKeys } from "../src/features/Products/hooks/productKeys";
import type { ProductRecord } from "../src/features/Products/types";

const product: ProductRecord = {
  id: "product-1",
  categoryId: "11111111-1111-4111-8111-111111111111",
  categoryName: "Food essentials",
  categorySlug: "food-essentials",
  sku: "RICE-5KG",
  name: "Rice 5 kg",
  description: null,
  priceMinor: 4500,
  currency: "MAD",
  imageUrl: null,
  status: "active",
  createdAt: "2026-07-17T10:00:00.000Z",
  updatedAt: "2026-07-17T10:00:00.000Z",
};

describe("Phase 6D product form contracts", () => {
  test("creates a priced product without client-controlled lifecycle fields and auto-derives SKU from name", () => {
    const values = createProductFormSchema.parse({
      categoryId: product.categoryId,
      name: "  Rice 5 kg  ",
      description: "  Household staple  ",
      priceMad: "45.00",
      imageUrl: "",
    });

    const input = toCreateProductInput(values);

    expect(input).toEqual({
      categoryId: product.categoryId,
      sku: "RICE-5-KG",
      name: "Rice 5 kg",
      description: "Household staple",
      priceMinor: 4500,
      imageUrl: null,
    });
    expect(input).not.toHaveProperty("status");
    expect(input).not.toHaveProperty("currency");
  });

  test("rejects imprecise prices and invalid image URLs", () => {
    expect(
      createProductFormSchema.safeParse({
        categoryId: product.categoryId,
        name: "Rice",
        description: "",
        priceMad: "45.001",
        imageUrl: "not-a-url",
      }).success,
    ).toBe(false);
  });

  test("does not retarget an unchanged product category during an update and auto-derives SKU from name", () => {
    const values = updateProductFormSchema.parse({
      categoryId: product.categoryId,
      name: "Rice 5 kg premium",
      description: "",
      priceMad: "50",
      imageUrl: "",
    });

    expect(toUpdateProductInput(product, values)).toEqual({
      sku: "RICE-5-KG-PREMIUM",
      name: "Rice 5 kg premium",
      description: null,
      priceMinor: 5000,
      imageUrl: null,
    });
    expect(toUpdateProductInput(product, values)).not.toHaveProperty("categoryId");
  });
});

describe("Phase 6D product lifecycle contracts", () => {
  test("requires an audited reason for product activation changes", () => {
    expect(productStatusFormSchema.safeParse({ reason: "" }).success).toBe(false);
    const values = productStatusFormSchema.parse({ reason: "  Seasonal catalog review  " });
    expect(toProductStatusInput(product.id, values)).toEqual({
      id: product.id,
      reason: "Seasonal catalog review",
    });
  });

  test("keeps stable product list, category-source, and detail query keys", () => {
    expect(productKeys.list({ limit: 25, offset: 50 })).toEqual([
      "products",
      "list",
      { limit: 25, offset: 50 },
    ]);
    expect(productKeys.categories).toEqual(["products", "categories"]);
    expect(productKeys.detail(product.id)).toEqual(["products", "detail", product.id]);
  });
});
