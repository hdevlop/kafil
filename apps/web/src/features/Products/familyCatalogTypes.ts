import type { OffsetPagination } from "najm-kit/pagination";

export interface FamilyCatalogCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image?: string | null;
  itemCount?: number;
  status?: "active";
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
  status: "active";
}

export interface FamilyCatalogQuery extends OffsetPagination {
  categoryId?: string;
  search?: string;
}
