import { categoryKeys } from "@/features/Categories/hooks/categoryKeys";
import { familyOrderingKeys } from "@/features/Orders/hooks/familyOrderingKeys";
import { productKeys } from "@/features/Products/hooks/productKeys";

/**
 * Every catalog write can change operator lists, the family-visible catalog,
 * or carts containing a removed product.
 */
export const catalogWriteKeys = [
  categoryKeys.all,
  productKeys.all,
  familyOrderingKeys.all,
] as const;
