import { z } from "zod";

export const deliveryDashboardQuery = z.object({
  date: z.iso.date(),
});

export type DeliveryDashboardQuery = z.input<typeof deliveryDashboardQuery>;
