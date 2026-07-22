import { describe, expect, test } from "bun:test";

import {
  inventoryAdjustmentFormSchema,
  inventoryRestockFormSchema,
  toInventoryAdjustmentInput,
  toInventoryRestockInput,
} from "../src/features/Inventory/config/inventorySchemas";
import { inventoryKeys } from "../src/features/Inventory/hooks/inventoryKeys";

describe("Phase 6D inventory command contracts", () => {
  test("creates a positive idempotent stock receipt", () => {
    const values = inventoryRestockFormSchema.parse({
      quantity: "25",
      reason: "  July supplier delivery  ",
    });

    expect(toInventoryRestockInput(values, "receipt-0001")).toEqual({
      quantity: 25,
      idempotencyKey: "receipt-0001",
      reason: "July supplier delivery",
    });
  });

  test("creates a signed idempotent manual stock adjustment", () => {
    const values = inventoryAdjustmentFormSchema.parse({
      quantity: "-2",
      reason: "  Damaged packaging correction  ",
    });

    expect(toInventoryAdjustmentInput(values, "adjustment-0001")).toEqual({
      quantity: -2,
      idempotencyKey: "adjustment-0001",
      reason: "Damaged packaging correction",
    });
  });

  test("rejects zero, fractional, and out-of-range stock quantities", () => {
    expect(inventoryRestockFormSchema.safeParse({ quantity: 0, reason: "No" }).success).toBe(false);
    expect(inventoryAdjustmentFormSchema.safeParse({ quantity: 0, reason: "No change" }).success).toBe(false);
    expect(inventoryAdjustmentFormSchema.safeParse({ quantity: 1.5, reason: "Fraction" }).success).toBe(false);
    expect(inventoryRestockFormSchema.safeParse({ quantity: 1_000_001, reason: "Too much" }).success).toBe(false);
  });

  test("requires an audit reason for every stock-changing command", () => {
    expect(inventoryRestockFormSchema.safeParse({ quantity: 1, reason: "" }).success).toBe(false);
    expect(inventoryAdjustmentFormSchema.safeParse({ quantity: -1, reason: "  " }).success).toBe(false);
  });

  test("keeps stable selected-product balance and ledger query keys", () => {
    expect(inventoryKeys.balance("product-1")).toEqual(["inventory", "detail", "product-1"]);
    expect(inventoryKeys.ledger("product-1", { limit: 25, offset: 50 })).toEqual([
      "inventory-ledger",
      "list",
      { productId: "product-1", limit: 25, offset: 50 },
    ]);
  });
});
