"use client";

import { useEntityCommand } from "@/hooks/useEntityCommand";
import { useEntityQuery } from "@/hooks/useEntityQuery";
import type { OffsetPagination } from "@/lib/pagination";
import {
  createInventoryAdjustment,
  createInventoryRestock,
  getInventoryBalance,
  listInventoryLedger,
  listInventoryProducts,
} from "@/services/inventoryApi";

import { inventoryKeys } from "./inventoryKeys";

export function useInventoryProducts() {
  return useEntityQuery({
    queryKey: inventoryKeys.products,
    queryFn: listInventoryProducts,
  });
}

export function useInventoryBalance(productId: string) {
  return useEntityQuery({
    queryKey: inventoryKeys.balance(productId),
    queryFn: () => getInventoryBalance(productId),
    enabled: Boolean(productId),
  });
}

export function useInventoryLedger(
  productId: string,
  pagination: OffsetPagination,
) {
  return useEntityQuery({
    queryKey: inventoryKeys.ledger(productId, pagination),
    queryFn: () => listInventoryLedger(productId, pagination),
    enabled: Boolean(productId),
  });
}

export function useInventoryCommands() {
  const invalidate = [inventoryKeys.all];

  const restock = useEntityCommand({
    mutationFn: createInventoryRestock,
    invalidate,
    successMessage: "Stock receipt recorded.",
    errorMessage: "Could not record the stock receipt.",
  });
  const adjust = useEntityCommand({
    mutationFn: createInventoryAdjustment,
    invalidate,
    successMessage: "Inventory adjustment recorded.",
    errorMessage: "Could not record the inventory adjustment.",
  });

  return { restock, adjust };
}
