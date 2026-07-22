import type { OffsetPagination } from "@/lib/pagination";

export interface FamilyCatalogCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
}

export interface FamilyCatalogProduct {
  id: string;
  categoryId: string;
  categoryName: string;
  categorySlug: string;
  sku: string;
  name: string;
  description: string | null;
  priceMinor: number;
  currency: "MAD" | string;
  imageUrl: string | null;
}

export interface FamilyCatalogQuery extends OffsetPagination {
  categoryId?: string;
  search?: string;
}
