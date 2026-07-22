import type { OffsetPagination } from "@/lib/pagination";
import { api } from "@/services/http";
import type {
  CategoryRecord,
  CreateCategoryInput,
  CategoryStatusInput,
  UpdateCategoryInput,
} from "@/features/Categories/types";

export function listCategories(pagination: OffsetPagination) {
  return api.get<CategoryRecord[]>("/catalog/categories", {
    query: { limit: pagination.limit, offset: pagination.offset },
  });
}

export function getCategory(id: string) {
  return api.get<CategoryRecord>(`/catalog/categories/${id}`);
}

export function createCategory(input: CreateCategoryInput) {
  return api.post<CategoryRecord>("/catalog/categories", input);
}

export function updateCategory({
  id,
  input,
}: {
  id: string;
  input: UpdateCategoryInput;
}) {
  return api.put<CategoryRecord>(`/catalog/categories/${id}`, input);
}

export function activateCategory({ id, reason }: CategoryStatusInput) {
  return api.post<CategoryRecord>(`/catalog/categories/${id}/activate`, { reason });
}

export function deactivateCategory({ id, reason }: CategoryStatusInput) {
  return api.post<CategoryRecord>(`/catalog/categories/${id}/deactivate`, { reason });
}

const CATEGORY_IMAGE_ROUTE = "/category-images/files/";

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

export async function uploadCategoryImage(file: File) {
  const fileName = `${crypto.randomUUID()}.${imageExtension(file)}`;
  await api.upload(`${CATEGORY_IMAGE_ROUTE}${fileName}`, file);
  return `/api${CATEGORY_IMAGE_ROUTE}serve/${fileName}`;
}

export function deleteCategoryImage(imagePath: string) {
  const fileName = imagePath.slice(imagePath.lastIndexOf("/") + 1);
  return api.deleteFile(`${CATEGORY_IMAGE_ROUTE}${encodeURIComponent(fileName)}`);
}
