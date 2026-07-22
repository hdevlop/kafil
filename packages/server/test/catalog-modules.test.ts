import { describe, expect, it } from "bun:test";
import { getMcpTools } from "najm-mcp";

import { AuditService } from "../src/modules/audit";
import {
  CatalogController,
  CatalogService,
  CatalogValidator,
  createProductDto,
  inventoryAdjustmentDto,
  InventoryRepository,
  ProductRepository,
  restockDto,
} from "../src/modules/catalog";
import { CategoryRepository } from "../src/modules/catalog/catalogRepository";

const productId = "00000000-0000-4000-8000-000000000071";

describe("Phase 4 catalog contracts", () => {
  it("validates minor-unit prices and whole stock quantities", () => {
    expect(
      createProductDto.safeParse({
        categoryId: "00000000-0000-4000-8000-000000000072",
        sku: "RICE-5KG",
        name: "Rice 5kg",
        priceMinor: 99.5,
      }).success,
    ).toBe(false);
    expect(
      restockDto.parse({
        quantity: "6",
        idempotencyKey: "receipt-0001",
        reason: "July warehouse receipt",
      }).quantity,
    ).toBe(6);
    expect(
      inventoryAdjustmentDto.safeParse({
        quantity: 0,
        idempotencyKey: "adjustment-0001",
        reason: "Invalid empty adjustment",
      }).success,
    ).toBe(false);
  });

  it("has no hard-delete catalog command and exposes separate stock commands", () => {
    const methods = getMcpTools(CatalogController).map((tool) => tool.methodKey);
    expect(methods).toContain("deactivateProduct");
    expect(methods).toContain("restock");
    expect(methods).toContain("adjustInventory");
    expect(methods).not.toContain("deleteProduct");
    expect(methods).not.toContain("deleteCategory");
  });
});

describe("Phase 4 stock transactions", () => {
  it("locks a balance and appends an idempotent stock receipt", async () => {
    const balanceUpdates: Record<string, unknown>[] = [];
    const entries: Record<string, unknown>[] = [];
    const service = new CatalogService(
      {} as CategoryRepository,
      {} as ProductRepository,
      {
        findLedgerByIdempotencyKey: async () => undefined,
        createForProduct: async () => balanceRecord(),
        lockByProductId: async () => balanceRecord(),
        updateBalance: async (_id: string, balance: Record<string, unknown>) => {
          balanceUpdates.push(balance);
          return balanceRecord(balance);
        },
        appendLedger: async (entry: Record<string, unknown>) => {
          entries.push(entry);
          return { id: "inventory-ledger-1", ...entry };
        },
      } as unknown as InventoryRepository,
      { record: async () => undefined } as unknown as AuditService,
      { ensureProductExists: async () => productRecord() } as unknown as CatalogValidator,
    );

    await service.restock(
      productId,
      {
        quantity: 8,
        idempotencyKey: "receipt-0002",
        reason: "July warehouse receipt",
      },
      "operator-user",
    );

    expect(balanceUpdates).toEqual([{ onHandQuantity: 18, reservedQuantity: 2 }]);
    expect(entries).toEqual([
      expect.objectContaining({
        entryType: "restock",
        quantity: 8,
        onHandAfter: 18,
        reservedAfter: 2,
      }),
    ]);
  });

  it("rejects a reduction that would put on-hand stock below reservations", async () => {
    const service = new CatalogService(
      {} as CategoryRepository,
      {} as ProductRepository,
      {
        findLedgerByIdempotencyKey: async () => undefined,
        createForProduct: async () => balanceRecord({ onHandQuantity: 5, reservedQuantity: 4 }),
        lockByProductId: async () => balanceRecord({ onHandQuantity: 5, reservedQuantity: 4 }),
      } as unknown as InventoryRepository,
      {} as AuditService,
      { ensureProductExists: async () => productRecord() } as unknown as CatalogValidator,
    );

    await expect(
      service.adjustInventory(
        productId,
        {
          quantity: -2,
          idempotencyKey: "adjustment-0002",
          reason: "Damaged stock count",
        },
        "operator-user",
      ),
    ).rejects.toMatchObject({ status: 409 });
  });

  it("returns an existing inventory entry for a repeated idempotency key", async () => {
    const service = new CatalogService(
      {} as CategoryRepository,
      {} as ProductRepository,
      {
        findLedgerByIdempotencyKey: async () => ({
          id: "inventory-ledger-existing",
          productId,
          idempotencyKey: "receipt-duplicate",
        }),
      } as unknown as InventoryRepository,
      {} as AuditService,
      {
        ensureProductExists: async () => productRecord(),
        ensureSameProduct: () => undefined,
      } as unknown as CatalogValidator,
    );

    await expect(
      service.restock(
        productId,
        {
          quantity: 8,
          idempotencyKey: "receipt-duplicate",
          reason: "Repeated warehouse receipt request",
        },
        "operator-user",
      ),
    ).resolves.toMatchObject({ id: "inventory-ledger-existing" });
  });
});

function balanceRecord(overrides: Record<string, unknown> = {}) {
  return {
    productId,
    onHandQuantity: 10,
    reservedQuantity: 2,
    version: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function productRecord() {
  return {
    id: productId,
    categoryId: "00000000-0000-4000-8000-000000000072",
    status: "active",
  };
}
