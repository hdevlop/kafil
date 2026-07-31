import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterAll, describe, expect, it } from "bun:test";

import {
  seedDemoCatalogProducts,
  type DemoCatalogService,
  type DemoProductRecord,
} from "../src/demo-catalog";
import {
  DEMO_PRODUCT_FIXTURES,
  LEGACY_DEMO_PRODUCT_SKUS,
} from "../src/demo-product-fixtures";

const temporaryRoots: string[] = [];

afterAll(async () => {
  await Promise.all(
    temporaryRoots.map((root) => rm(root, { force: true, recursive: true })),
  );
});

describe("demo catalog products", () => {
  it("defines 29 unique product fixtures backed by packaged product images", () => {
    expect(DEMO_PRODUCT_FIXTURES).toHaveLength(29);
    expect(
      new Set(DEMO_PRODUCT_FIXTURES.map((fixture) => fixture.sku)).size,
    ).toBe(29);
    expect(
      new Set(DEMO_PRODUCT_FIXTURES.map((fixture) => fixture.imageFileName))
        .size,
    ).toBe(29);
    expect(
      DEMO_PRODUCT_FIXTURES.every(
        (fixture) =>
          fixture.imageFileName.startsWith("product-") &&
          fixture.imageFileName.endsWith(".webp"),
      ),
    ).toBe(true);
  });

  it("inserts, skips, and repairs the image-backed product fixtures", async () => {
    const storagePath = await mkdtemp(join(tmpdir(), "kafil-demo-products-"));
    temporaryRoots.push(storagePath);
    const categories = DEMO_PRODUCT_FIXTURES.map((fixture, index) => ({
      id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
      slug: fixture.categorySlug,
    }));
    const products: DemoProductRecord[] = [];
    const service: DemoCatalogService = {
      async createProduct(data) {
        const product: DemoProductRecord = {
          categoryId: data.categoryId,
          description: data.description ?? null,
          id: `10000000-0000-4000-8000-${String(products.length + 1).padStart(12, "0")}`,
          imageUrl: data.imageUrl ?? null,
          name: data.name,
          priceMinor: Number(data.priceMinor),
          sku: data.sku,
          status: "active",
        };
        products.push(product);
        return product;
      },
      async listCategories() {
        return categories;
      },
      async listProducts() {
        return products;
      },
      async setProductStatus(id, status) {
        const product = products.find((candidate) => candidate.id === id)!;
        product.status = status;
        return product;
      },
      async updateProduct(id, data) {
        const product = products.find((candidate) => candidate.id === id)!;
        Object.assign(product, {
          ...data,
          description: data.description ?? null,
          imageUrl: data.imageUrl ?? null,
          priceMinor: Number(data.priceMinor),
        });
        return product;
      },
    };

    expect(
      await seedDemoCatalogProducts(service, "admin", { storagePath }),
    ).toEqual({ inserted: 29, repaired: 0, retired: 0, skipped: 0 });
    products.push({
      categoryId: categories[0]!.id,
      description: "Replaced generic demo fixture.",
      id: "10000000-0000-4000-8000-999999999999",
      imageUrl: null,
      name: "Legacy generic demo product",
      priceMinor: 1_000,
      sku: LEGACY_DEMO_PRODUCT_SKUS[0],
      status: "active",
    });
    expect(
      await seedDemoCatalogProducts(service, "admin", { storagePath }),
    ).toEqual({ inserted: 0, repaired: 0, retired: 1, skipped: 29 });
    expect(products.at(-1)?.status).toBe("inactive");
    products[0]!.name = "Changed outside the seed";
    products[0]!.status = "inactive";
    expect(
      await seedDemoCatalogProducts(service, "admin", { storagePath }),
    ).toEqual({ inserted: 0, repaired: 1, retired: 0, skipped: 28 });
    expect(products[0]).toMatchObject({
      name: DEMO_PRODUCT_FIXTURES[0]!.name,
      status: "active",
    });
    expect(await readdir(join(storagePath, "product-images"))).toHaveLength(29);
  }, 20_000);
});
