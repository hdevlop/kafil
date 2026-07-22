export interface ProductCommandRecord {
  id: string;
  categoryId: string;
  sku: string;
  name: string;
  description: string | null;
  priceMinor: number;
  currency: "MAD" | string;
  imageUrl: string | null;
  status: "active" | "inactive" | string;
  createdAt: string;
  updatedAt: string;
}

export interface ProductRecord extends ProductCommandRecord {
  categoryName: string;
  categorySlug: string;
}

export interface ProductCategory {
  id: string;
  name: string;
  slug: string;
  status: "active" | "inactive" | string;
}

export interface ProductFields {
  categoryId: string;
  sku: string;
  name: string;
  description: string | null;
  priceMinor: number;
  imageUrl: string | null;
}

export type CreateProductInput = ProductFields;
export type UpdateProductInput = Partial<ProductFields>;

export interface ProductStatusInput {
  id: string;
  reason: string;
}
