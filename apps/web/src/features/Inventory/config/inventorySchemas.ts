import { z } from "zod";

import type {
  InventoryAdjustmentInput,
  InventoryRestockInput,
} from "../types";

const auditedReason = z.string().trim().min(3, "Give a short reason").max(500);

export const inventoryRestockFormSchema = z.object({
  quantity: z.coerce.number().int().min(1).max(1_000_000),
  reason: auditedReason,
});

export const inventoryAdjustmentFormSchema = z.object({
  quantity: z
    .coerce
    .number()
    .int()
    .min(-1_000_000)
    .max(1_000_000)
    .refine((quantity) => quantity !== 0, "Enter a non-zero quantity"),
  reason: auditedReason,
});

export type InventoryRestockFormValues = z.infer<typeof inventoryRestockFormSchema>;
export type InventoryAdjustmentFormValues = z.infer<typeof inventoryAdjustmentFormSchema>;

export function toInventoryRestockInput(
  values: InventoryRestockFormValues,
  idempotencyKey: string,
): InventoryRestockInput {
  return {
    quantity: values.quantity,
    idempotencyKey,
    reason: values.reason.trim(),
  };
}

export function toInventoryAdjustmentInput(
  values: InventoryAdjustmentFormValues,
  idempotencyKey: string,
): InventoryAdjustmentInput {
  return {
    quantity: values.quantity,
    idempotencyKey,
    reason: values.reason.trim(),
  };
}
