import { z } from "zod";

import type { OrderReasonInput } from "../types";

export const orderReasonFormSchema = z.object({
  reason: z.string().trim().min(3, "Give a short reason").max(500),
});

export type OrderReasonFormValues = z.infer<typeof orderReasonFormSchema>;

export function toOrderReasonInput(
  id: string,
  values: OrderReasonFormValues,
): OrderReasonInput {
  return { id, reason: values.reason };
}
