import { z } from "zod";

import { positiveMinorAmountDto, signedMinorAmountDto } from "../budgets/money";
import { CATEGORY_IMAGE_SERVE_PREFIX } from "./categoryImageController";
import { PRODUCT_IMAGE_SERVE_PREFIX } from "./productImageController";

const id = z.string().uuid();
const slug = z.string().trim().min(2).max(160).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const sku = z.string().trim().min(2).max(80).regex(/^[A-Za-z0-9][A-Za-z0-9_-]*$/);
const name = z.string().trim().min(2).max(200);
const description = z.string().trim().max(4_000).nullish();
const categoryImage = z.union([
  z.url().max(2_000),
  z.string().startsWith(CATEGORY_IMAGE_SERVE_PREFIX).max(2_000),
]);
const productImage = z.union([
  z.url().max(2_000),
  z.string().startsWith(PRODUCT_IMAGE_SERVE_PREFIX).max(2_000),
]);

export const categoryIdParams = z.object({ id });
export const productIdParams = z.object({ id });

export const categoryListQuery = z.object({
  status: z.enum(["active", "inactive"]).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export const productListQuery = z.object({
  categoryId: id.optional(),
  status: z.enum(["active", "inactive"]).optional(),
  search: z.string().trim().min(1).max(100).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export const createCategoryDto = z.object({
  name: name.max(160),
  slug,
  description,
  image: categoryImage.nullish(),
  sortOrder: z.coerce.number().int().min(0).max(100_000).default(0),
});

export const updateCategoryDto = createCategoryDto
  .partial()
  .refine((input) => Object.keys(input).length > 0, "Provide a category change");

export const createProductDto = z.object({
  categoryId: id,
  sku,
  name,
  description,
  priceMinor: positiveMinorAmountDto,
  imageUrl: productImage.nullish(),
});

export const updateProductDto = createProductDto
  .partial()
  .refine((input) => Object.keys(input).length > 0, "Provide a product change");

export const statusReasonDto = z.object({
  reason: z.string().trim().min(3).max(500),
});

export const restockDto = z.object({
  quantity: z.coerce.number().int().min(1).max(1_000_000),
  idempotencyKey: z.string().trim().min(8).max(160),
  reason: z.string().trim().min(3).max(500),
});

export const inventoryAdjustmentDto = z.object({
  quantity: signedMinorAmountDto.max(1_000_000).min(-1_000_000),
  idempotencyKey: z.string().trim().min(8).max(160),
  reason: z.string().trim().min(3).max(500),
});

export const inventoryLedgerListQuery = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export type CategoryListQuery = z.input<typeof categoryListQuery>;
export type ProductListQuery = z.input<typeof productListQuery>;
export type CreateCategoryDto = z.input<typeof createCategoryDto>;
export type UpdateCategoryDto = z.input<typeof updateCategoryDto>;
export type CreateProductDto = z.input<typeof createProductDto>;
export type UpdateProductDto = z.input<typeof updateProductDto>;
export type StatusReasonDto = z.input<typeof statusReasonDto>;
export type RestockDto = z.input<typeof restockDto>;
export type InventoryAdjustmentDto = z.input<typeof inventoryAdjustmentDto>;
export type InventoryLedgerListQuery = z.input<typeof inventoryLedgerListQuery>;
