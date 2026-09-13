import { z } from "zod";

export const deliveryDashboardQuery = z.object({
  date: z.iso.date(),
});

export type DeliveryDashboardQuery = z.input<typeof deliveryDashboardQuery>;

export const deliveryFamiliesQuery = z.object({
  date: z.iso.date(),
  search: z.string().trim().min(1).max(100).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export type DeliveryFamiliesQuery = z.input<typeof deliveryFamiliesQuery>;
