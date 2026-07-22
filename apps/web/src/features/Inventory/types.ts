export interface InventoryProduct {
  id: string;
  name: string;
  sku: string;
  categoryName: string;
  status: "active" | "inactive" | string;
}

export interface InventoryBalance {
  productId: string;
  onHandQuantity: number;
  reservedQuantity: number;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryLedgerEntry {
  id: string;
  productId: string;
  entryType: string;
  quantity: number;
  onHandAfter: number;
  reservedAfter: number;
  sourceType: string;
  sourceId: string;
  idempotencyKey: string;
  actorUserId: string | null;
  reason: string | null;
  reversesEntryId: string | null;
  createdAt: string;
}

export interface InventoryRestockInput {
  quantity: number;
  idempotencyKey: string;
  reason: string;
}

export interface InventoryAdjustmentInput {
  quantity: number;
  idempotencyKey: string;
  reason: string;
}
