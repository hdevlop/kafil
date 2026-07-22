import { z } from "zod";

import { slugify } from "@/lib/slugify";
import { PRODUCT_IMAGE_SERVE_PREFIX } from "@/services/productApi";

import type {
  CreateProductInput,
  ProductRecord,
  ProductStatusInput,
  UpdateProductInput,
} from "../types";

const madAmountPattern = /^\d+(?:[.,]\d{1,2})?$/;
const maximumMinorUnits = BigInt(Number.MAX_SAFE_INTEGER);

function parseMadAmount(value: string) {
  const normalized = value.trim().replace(",", ".");
  if (!madAmountPattern.test(normalized)) return null;

  const [whole, fraction = ""] = normalized.split(".");
  const minor = BigInt(`${whole}${fraction.padEnd(2, "0")}`);

  if (minor > maximumMinorUnits) return null;
  return Number(minor);
}

const positiveMadAmount = z
  .string()
  .trim()
  .regex(madAmountPattern, "Enter an amount with up to two decimals")
  .refine(
    (value) => {
      const minor = parseMadAmount(value);
      return minor !== null && minor > 0;
    },
    "Enter a positive MAD amount within the supported range",
  );

const productImageUrl = z.union([
  z.literal(""),
  z.string().startsWith(PRODUCT_IMAGE_SERVE_PREFIX).max(2_000),
  z.url("Enter a valid image URL").max(2_000),
]);

const productFields = {
  categoryId: z.string().uuid("Choose an active category"),
  name: z.string().trim().min(2, "Enter a product name").max(200),
  description: z.string().trim().max(4_000).optional(),
  priceMad: positiveMadAmount,
  imageUrl: productImageUrl,
};

export const createProductFormSchema = z.object(productFields);
export const updateProductFormSchema = z.object(productFields);
export const productStatusFormSchema = z.object({
  reason: z.string().trim().min(3, "Give a short reason").max(500),
});

export type CreateProductFormValues = z.infer<typeof createProductFormSchema>;
export type UpdateProductFormValues = z.infer<typeof updateProductFormSchema>;
export type ProductStatusFormValues = z.infer<typeof productStatusFormSchema>;

function nullable(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed || null;
}

function toCreateProductFields(
  values: CreateProductFormValues,
): CreateProductInput {
  const priceMinor = parseMadAmount(values.priceMad);
  if (priceMinor === null || priceMinor <= 0) {
    throw new Error("Invalid product price");
  }

  return {
    categoryId: values.categoryId,
    sku: slugify(values.name, { upperCase: true }),
    name: values.name.trim(),
    description: nullable(values.description),
    priceMinor,
    imageUrl: nullable(values.imageUrl),
  };
}

export function toCreateProductInput(
  values: CreateProductFormValues,
): CreateProductInput {
  return toCreateProductFields(values);
}

export function toUpdateProductInput(
  product: ProductRecord,
  values: UpdateProductFormValues,
): UpdateProductInput {
  const input = toCreateProductFields(values);
  const { categoryId, ...productFields } = input;

  return categoryId === product.categoryId ? productFields : input;
}

export function toProductStatusInput(
  id: string,
  values: ProductStatusFormValues,
): ProductStatusInput {
  return { id, reason: values.reason.trim() };
}
