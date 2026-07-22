import { z } from "zod";

import { slugify } from "@/lib/slugify";

import type {
  CategoryFields,
  CategoryStatusInput,
  CreateCategoryInput,
  UpdateCategoryInput,
} from "../types";

const categoryFields = {
  name: z.string().trim().min(2, "Enter a category name").max(160),
  description: z.string().trim().max(4_000).optional(),
  sortOrder: z.coerce.number().int().min(0).max(100_000),
};

export const createCategoryFormSchema = z.object(categoryFields);
export const updateCategoryFormSchema = z.object(categoryFields);
export const categoryStatusFormSchema = z.object({
  reason: z.string().trim().min(3, "Give a short reason").max(500),
});

export type CreateCategoryFormValues = z.infer<typeof createCategoryFormSchema>;
export type UpdateCategoryFormValues = z.infer<typeof updateCategoryFormSchema>;
export type CategoryStatusFormValues = z.infer<typeof categoryStatusFormSchema>;

function toCategoryFields(values: CreateCategoryFormValues): CategoryFields {
  const description = values.description?.trim();

  return {
    name: values.name.trim(),
    slug: slugify(values.name),
    description: description || null,
    image: null,
    sortOrder: values.sortOrder,
  };
}

export function toCreateCategoryInput(
  values: CreateCategoryFormValues,
): CreateCategoryInput {
  return toCategoryFields(values);
}

export function toUpdateCategoryInput(
  values: UpdateCategoryFormValues,
): UpdateCategoryInput {
  return toCategoryFields(values);
}

export function toCategoryStatusInput(
  id: string,
  values: CategoryStatusFormValues,
): CategoryStatusInput {
  return { id, reason: values.reason.trim() };
}
