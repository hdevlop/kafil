import type { OffsetPagination } from "@/lib/pagination";
import { api } from "@/services/http";
import type {
  CreateProductInput,
  ProductCommandRecord,
  ProductCategory,
  ProductRecord,
  ProductStatusInput,
  UpdateProductInput,
} from "@/features/Products/types";

export function listProducts(pagination: OffsetPagination) {
  return api.get<ProductRecord[]>("/catalog/products", {
    query: { limit: pagination.limit, offset: pagination.offset },
  });
}

export function getProduct(id: string) {
  return api.get<ProductRecord>(`/catalog/products/${id}`);
}

export function listProductCategories() {
  return api.get<ProductCategory[]>("/catalog/categories", {
    query: { status: "active", limit: 100, offset: 0 },
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

export const PRODUCT_IMAGE_SERVE_PREFIX = "/api/product-images/files/serve/" as const;
const PRODUCT_IMAGE_ROUTE = "/product-images/files/";

function imageExtension(file: File) {
  const extensionByMimeType: Record<string, string> = {
    "image/avif": "avif",
    "image/gif": "gif",
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  };

  return extensionByMimeType[file.type] ?? "img";
}

export async function uploadProductImage(file: File) {
  const fileName = `${crypto.randomUUID()}.${imageExtension(file)}`;
  await api.upload(`${PRODUCT_IMAGE_ROUTE}${fileName}`, file);
  return `/api${PRODUCT_IMAGE_ROUTE}serve/${fileName}`;
}

export function deleteProductImage(imagePath: string) {
  const fileName = imagePath.slice(imagePath.lastIndexOf("/") + 1);
  return api.deleteFile(`${PRODUCT_IMAGE_ROUTE}${encodeURIComponent(fileName)}`);
}
