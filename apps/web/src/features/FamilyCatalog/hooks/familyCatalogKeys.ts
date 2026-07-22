import { entityKeys } from "@/hooks/queryKeys";

import type { FamilyCatalogQuery } from "../types";

export const familyCatalogKeys = {
  all: entityKeys.all("family-catalog"),
  categories: ["family-catalog", "categories"] as const,
  products(query: FamilyCatalogQuery) {
    const search = query.search?.trim();

    return entityKeys.list("family-catalog", {
      limit: query.limit,
      offset: query.offset,
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(search ? { search } : {}),
    });
  },
};
