import type { OffsetPagination } from "@/lib/pagination";
import { api } from "@/services/http";
import type {
  InventoryBalance,
  InventoryLedgerEntry,
  InventoryProduct,
  InventoryAdjustmentInput,
  InventoryRestockInput,
} from "@/features/Inventory/types";

export function listInventoryProducts() {
  return api.get<InventoryProduct[]>("/catalog/products", {
    query: { limit: 100, offset: 0 },
  });
}

export function getInventoryBalance(productId: string) {
  return api.get<InventoryBalance>(`/catalog/products/${productId}/inventory`);
}

export function listInventoryLedger(
  productId: string,
  pagination: OffsetPagination,
) {
  return api.get<InventoryLedgerEntry[]>(
    `/catalog/products/${productId}/inventory/ledger`,
    { query: { limit: pagination.limit, offset: pagination.offset } },
  );
}

export function createInventoryRestock({
  productId,
  input,
}: {
  productId: string;
  input: InventoryRestockInput;
}) {
  return api.post<InventoryLedgerEntry>(
    `/catalog/products/${productId}/inventory/restocks`,
    input,
  );
}

export function createInventoryAdjustment({
  productId,
  input,
}: {
  productId: string;
  input: InventoryAdjustmentInput;
}) {
  return api.post<InventoryLedgerEntry>(
    `/catalog/products/${productId}/inventory/adjustments`,
    input,
  );
}
