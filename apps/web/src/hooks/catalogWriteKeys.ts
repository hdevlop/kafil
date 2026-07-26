import { categoryKeys } from "@/features/Categories/hooks/categoryKeys";
import { familyOrderingKeys } from "@/features/FamilyOrdering/hooks/familyOrderingKeys";
import { inventoryKeys } from "@/features/Inventory/hooks/inventoryKeys";
import { productKeys } from "@/features/Products/hooks/productKeys";

/**
 * Every catalog write can change operator lists, inventory projections, the
 * family-visible catalog, or carts containing a removed product.
 */
export const catalogWriteKeys = [
  categoryKeys.all,
  productKeys.all,
  inventoryKeys.all,
  familyOrderingKeys.all,
] as const;
