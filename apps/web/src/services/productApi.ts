import type { OffsetPagination } from "najm-kit/pagination";
import { api } from "@/services/http";
import type {
  CreateProductInput,
  ProductCommandRecord,
  ProductCategory,
  ProductRecord,
  ProductStatusInput,
  UpdateProductInput,
} from "@/features/Products/types";

export interface ListProductsFilters {
  categoryId?: string;
  status?: "active" | "inactive";
  search?: string;
}

export function listProducts(
  pagination: OffsetPagination,
  filters: ListProductsFilters = {},
) {
  return api.getPage<ProductRecord>("/catalog/products", {
    query: {
      limit: pagination.limit,
      offset: pagination.offset,
      ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.search ? { search: filters.search } : {}),
    },
  });
}

export function getProduct(id: string) {
  return api.get<ProductRecord>(`/catalog/products/${id}`);
}

export function listProductCategories(
  search?: string,
  pagination: OffsetPagination = { limit: 25, offset: 0 },
) {
  return api.getPage<ProductCategory>("/catalog/categories", {
    query: { status: "active", ...pagination, search },
  });
}

export function createProduct(input: CreateProductInput) {
  return api.post<ProductCommandRecord>("/catalog/products", input);
}

export function updateProduct({
  id,
  input,
}: {
  id: string;
  input: UpdateProductInput;
}) {
  return api.put<ProductCommandRecord>(`/catalog/products/${id}`, input);
}

export function activateProduct({ id, reason }: ProductStatusInput) {
  return api.post<ProductCommandRecord>(`/catalog/products/${id}/activate`, { reason });
}

export function deactivateProduct({ id, reason }: ProductStatusInput) {
  return api.post<ProductCommandRecord>(`/catalog/products/${id}/deactivate`, { reason });
}

export function deleteProduct(id: string) {
  return api.delete<ProductCommandRecord>(`/catalog/products/${id}`);
}

export const PRODUCT_IMAGE_SERVE_PREFIX = "/api/product-images/files/serve/" as const;
const PRODUCT_IMAGE_ROUTE = "/product-images/files/";

function imageExtension(file: File) {
  const extensionByMimeType: Record<string, string> = {
    "image/avif": "avif",
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  };

  return extensionByMimeType[file.type] ?? "img";
}

export async function uploadProductImage(file: File) {
  const fileName = `${crypto.randomUUID()}.${imageExtension(file)}`;
  const uploaded = await api.upload<{ path: string }>(
    `${PRODUCT_IMAGE_ROUTE}${fileName}`,
    file,
  );
  return uploaded.path;
}

export function deleteProductImage(imagePath: string) {
  const fileName = imagePath.slice(imagePath.lastIndexOf("/") + 1);
  return api.deleteFile(`${PRODUCT_IMAGE_ROUTE}${encodeURIComponent(fileName)}`);
}
