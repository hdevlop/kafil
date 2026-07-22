import { z } from "zod";

const id = z.string().uuid();
const quantity = z.coerce.number().int().min(1).max(1_000);
const status = z.enum([
  "pending",
  "approved",
  "in_preparation",
  "delivered",
  "rejected",
  "cancelled",
]);
const reason = z.string().trim().min(3).max(500);

export const orderIdParams = z.object({ id });
export const cartProductIdParams = z.object({ productId: id });

export const cartItemDto = z.object({
  productId: id,
  quantity,
});

export const setCartItemQuantityDto = z.object({ quantity });

export const submitOrderDto = z.object({
  idempotencyKey: z.string().trim().min(8).max(160),
});

export const orderReasonDto = z.object({ reason });

export const familyCancelOrderDto = z.object({
  reason: reason.optional(),
});

export const orderListQuery = z.object({
  familyProfileId: id.optional(),
  status: status.optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export const ownOrderListQuery = z.object({
  status: status.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export type CartItemDto = z.input<typeof cartItemDto>;
export type SetCartItemQuantityDto = z.input<typeof setCartItemQuantityDto>;
export type SubmitOrderDto = z.input<typeof submitOrderDto>;
export type OrderReasonDto = z.input<typeof orderReasonDto>;
export type FamilyCancelOrderDto = z.input<typeof familyCancelOrderDto>;
export type OrderListQuery = z.input<typeof orderListQuery>;
export type OwnOrderListQuery = z.input<typeof ownOrderListQuery>;
