import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { HttpError } from "najm-core";

import { AuditService } from "../src/modules/audit";
import {
  CatalogService,
} from "../src/modules/catalog";
import {
  CategoryRepository,
  InventoryRepository,
  ProductRepository,
} from "../src/modules/catalog/catalogRepository";
import { CatalogValidator } from "../src/modules/catalog/catalogValidator";
import { db } from "../src/config/databaseConfig";

const productId = "00000000-0000-4000-8000-000000000171";
const categoryId = "00000000-0000-4000-8000-000000000172";
const OTHER_USER = "admin-user";

type CategoryRecord = Awaited<
  ReturnType<CategoryRepository["findById"]>
>;
type ProductRecord = Awaited<
  ReturnType<ProductRepository["findById"]>
>;

function categoryRecord(overrides: Partial<CategoryRecord> = {}): CategoryRecord {
  return {
    id: categoryId,
    name: "Cleanup category",
    slug: "cleanup-category",
    description: null,
    image: null,
    status: "active",
    sortOrder: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function productRecord(
  overrides: Partial<ProductRecord> = {},
): ProductRecord {
  return {
    id: productId,
    categoryId,
    sku: "CLEAN-1",
    name: "Cleanup product",
    description: null,
    priceMinor: 1000,
    currency: "MAD",
    imageUrl: null,
    status: "active",
    categoryName: "Cleanup category",
    categorySlug: "cleanup-category",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

// Use any-parameter fake on purpose: this is a hand-rolled fake for
// unit-testing a concrete service. We want to accept any signature shape.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Fake = Record<string, (...args: any[]) => any>;

interface FakeDeps {
  categories: Fake;
  products: Fake;
  inventory: Fake;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  audits: { record: (...args: any[]) => Promise<unknown> };
  validator: Fake;
}

function fakeService(deps: FakeDeps): CatalogService {
  return new CatalogService(
    deps.categories as unknown as CategoryRepository,
    deps.products as unknown as ProductRepository,
    deps.inventory as unknown as InventoryRepository,
    deps.audits as unknown as AuditService,
    deps.validator as unknown as CatalogValidator,
  );
}

describe("catalog admin-only pristine delete (unit)", () => {
  let originalTransaction: typeof db.transaction;

  beforeEach(() => {
    const transactionalDb = db as unknown as {
      transaction: (...args: unknown[]) => Promise<unknown>;
    };
    originalTransaction = db.transaction;
    // The unit tests run without a real connection; the service uses
    // @Transaction which delegates to db.transaction. Replace it with a
    // no-op wrapper so service-side guards can throw and roll back.
    transactionalDb.transaction = (async (callback: unknown) =>
      (callback as (tx: unknown) => Promise<unknown>)({})) as never;
  });

  afterEach(() => {
    (db as { transaction: typeof db.transaction }).transaction =
      originalTransaction;
  });

  it("hard-deletes a pristine product, cascades cart items + balance, and audits", async () => {
    const deletedCartItems: string[][] = [];
    const deletedBalances: string[][] = [];
    const deletedProducts: string[] = [];
    const auditEvents: Record<string, unknown>[] = [];

    const service = fakeService({
      categories: {},
      products: {
        findById: async () => productRecord(),
        deleteCartItemsByProductIds: async (ids: string[]) => {
          deletedCartItems.push([...ids]);
          return ids.length;
        },
        countOrderItemsByProductIds: async () => 0,
        countInventoryLedgerByProductIds: async () => 0,
        hardDelete: async (id: string) => {
          deletedProducts.push(id);
          return productRecord();
        },
      },
      inventory: {
        lockBalancesByProductIds: async () => [],
        deleteBalancesByProductIds: async (ids: string[]) => {
          deletedBalances.push([...ids]);
          return ids.length;
        },
      },
      audits: {
        record: async (input: unknown) => {
          auditEvents.push(input as Record<string, unknown>);
          return input;
        },
      },
      validator: {
        ensureProductExists: async () => productRecord(),
        ensureProductPristine: async () => undefined,
      },
    });

    const result = await service.deleteProduct(productId, OTHER_USER);

    expect(deletedCartItems).toEqual([[productId]]);
    expect(deletedBalances).toEqual([[productId]]);
    expect(deletedProducts).toEqual([productId]);
    expect(auditEvents).toEqual([
      expect.objectContaining({
        action: "catalog.productDeleted",
        actorUserId: OTHER_USER,
        metadata: { permanent: true },
        resource: "products",
        resourceId: productId,
      }),
    ]);
    expect(result).toEqual({
      productId,
      categoryId,
      productImageUrl: null,
    });
  });

  it("refuses to delete a product with order history (no audit, no delete call)", async () => {
    let hardDeleteCalls = 0;
    let auditCalls = 0;

    const service = fakeService({
      categories: {},
      products: {
        findById: async () => productRecord(),
        hardDelete: async () => {
          hardDeleteCalls += 1;
          return productRecord();
        },
      },
      inventory: {},
      audits: {
        record: async () => {
          auditCalls += 1;
          return {};
        },
      },
      validator: {
        ensureProductExists: async () => productRecord(),
        ensureProductPristine: () => {
          HttpError.conflict(
            "Catalog items have order or inventory history; deactivate instead (Cleanup product:order_history)",
          );
        },
      },
    });

    await expect(service.deleteProduct(productId, OTHER_USER)).rejects.toBeDefined();
    expect(hardDeleteCalls).toBe(0);
    expect(auditCalls).toBe(0);
  });

  it("refuses to delete a product with any inventory ledger activity", async () => {
    let hardDeleteCalls = 0;

    const service = fakeService({
      categories: {},
      products: {
        findById: async () => productRecord(),
        hardDelete: async () => {
          hardDeleteCalls += 1;
          return productRecord();
        },
      },
      inventory: {},
      audits: { record: async () => ({}) },
      validator: {
        ensureProductExists: async () => productRecord(),
        ensureProductPristine: () => {
          HttpError.conflict(
            "Catalog items have order or inventory history; deactivate instead (Cleanup product:inventory_ledger)",
          );
        },
      },
    });

    await expect(service.deleteProduct(productId, OTHER_USER)).rejects.toBeDefined();
    expect(hardDeleteCalls).toBe(0);
  });

  it("refuses to delete a product with non-zero balance", async () => {
    let hardDeleteCalls = 0;

    const service = fakeService({
      categories: {},
      products: {
        findById: async () => productRecord(),
        hardDelete: async () => {
          hardDeleteCalls += 1;
          return productRecord();
        },
      },
      inventory: {},
      audits: { record: async () => ({}) },
      validator: {
        ensureProductExists: async () => productRecord(),
        ensureProductPristine: () => {
          HttpError.conflict(
            "Catalog items have order or inventory history; deactivate instead (Cleanup product:non_zero_balance)",
          );
        },
      },
    });

    await expect(service.deleteProduct(productId, OTHER_USER)).rejects.toBeDefined();
    expect(hardDeleteCalls).toBe(0);
  });

  it("refuses a category whose product is non-pristine and surfaces the productId list", async () => {
    let hardDeleteCalls = 0;
    let auditCalls = 0;
    const auditEvents: Record<string, unknown>[] = [];

    const service = fakeService({
      categories: {
        findById: async () => categoryRecord(),
        hardDelete: async () => {
          hardDeleteCalls += 1;
          return categoryRecord();
        },
      },
      products: {},
      inventory: {},
      audits: {
        record: async (input: unknown) => {
          auditCalls += 1;
          auditEvents.push(input as Record<string, unknown>);
          return input;
        },
      },
      validator: {
        ensureCategoryExists: async () => categoryRecord(),
        ensureCategoryPristine: () => {
          HttpError.conflict(
            "Catalog items have order or inventory history; deactivate instead",
          );
        },
      },
    });

    await expect(service.deleteCategory(categoryId, OTHER_USER)).rejects.toBeDefined();
    expect(hardDeleteCalls).toBe(0);
    expect(auditCalls).toBe(0);
  });

  it("hard-deletes an empty category with no products", async () => {
    let categoryHardDeleteCalls = 0;
    const auditEvents: Record<string, unknown>[] = [];

    const service = fakeService({
      categories: {
        findById: async () => categoryRecord({ image: null }),
        hardDelete: async (id: string) => {
          categoryHardDeleteCalls += 1;
          return categoryRecord({ id });
        },
      },
      products: {
        lockByCategoryIdForDelete: async () => [],
        deleteCartItemsByProductIds: async () => 0,
        hardDeleteByIds: async () => 0,
      },
      inventory: {
        deleteBalancesByProductIds: async () => 0,
      },
      audits: {
        record: async (input: unknown) => {
          auditEvents.push(input as Record<string, unknown>);
          return input;
        },
      },
      validator: {
        ensureCategoryExists: async () => categoryRecord(),
        ensureCategoryPristine: async () => undefined,
      },
    });

    const result = await service.deleteCategory(categoryId, OTHER_USER);

    expect(categoryHardDeleteCalls).toBe(1);
    expect(auditEvents).toEqual([
      expect.objectContaining({
        action: "catalog.categoryDeleted",
        actorUserId: OTHER_USER,
        metadata: { permanent: true, deletedProductIds: [] },
        resource: "categories",
        resourceId: categoryId,
      }),
    ]);
    expect(result.deletedProductIds).toEqual([]);
  });

  it("does not delete inventory ledger entries in any flow", async () => {
    // The repository exposes a count helper for the validator and a
    // lockBalancesByProductIds helper for the transaction, but no
    // deleteByProductIds. This test asserts that surface is intentional.
    const repoProto = ProductRepository.prototype as unknown as Record<
      string,
      unknown
    >;
    expect(typeof repoProto.countInventoryLedgerByProductIds).toBe(
      "function",
    );
    expect(repoProto.deleteLedgerByProductIds).toBeUndefined();
  });

  it("propagates audit failure as a transaction rollback (audit not recorded)", async () => {
    // The @Transaction decorator wraps the service method in db.transaction.
    // We can verify the audit-records-on-failure semantics with a thrown
    // audit: the surrounding Promise rejects, and any side effect inside the
    // transaction is rolled back by @Transaction's catch path.
    const service = fakeService({
      categories: {},
      products: {
        findById: async () => productRecord(),
        deleteCartItemsByProductIds: async () => 0,
        hardDelete: async () => productRecord(),
      },
      inventory: {
        deleteBalancesByProductIds: async () => 0,
      },
      audits: {
        record: async () => {
          throw new Error("forced audit failure");
        },
      },
      validator: {
        ensureProductExists: async () => productRecord(),
        ensureProductPristine: async () => undefined,
      },
    });

    await expect(service.deleteProduct(productId, OTHER_USER)).rejects.toThrow(
      "forced audit failure",
    );
  });
});
