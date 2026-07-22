import { entityKeys } from "@/hooks/queryKeys";
import type { OffsetPagination } from "@/lib/pagination";

export const inventoryKeys = {
  all: entityKeys.all("inventory"),
  products: ["inventory", "products"] as const,
  balance(productId: string) {
    return entityKeys.detail("inventory", productId);
  },
  ledger(productId: string, pagination: OffsetPagination) {
    return entityKeys.list("inventory-ledger", {
      productId,
      limit: pagination.limit,
      offset: pagination.offset,
    });
  },
};
