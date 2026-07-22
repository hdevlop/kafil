export interface CategoryRecord {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  status: "active" | "inactive" | string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryFields {
  name: string;
  slug: string;
  description: string | null;
  image?: string | null;
  sortOrder: number;
}

export type CreateCategoryInput = CategoryFields;
export type UpdateCategoryInput = CategoryFields;

export interface CategoryStatusInput {
  id: string;
  reason: string;
}
