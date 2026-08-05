"use client";

import { useMemo, type Dispatch, type SetStateAction } from "react";
import type { OrderListQuery } from "../types";

type OrderFilters = Omit<OrderListQuery, "limit" | "offset">;

export function useOrdersTableFilters(
  includeRecipient: boolean,
  filters: OrderFilters,
  setFilters: Dispatch<SetStateAction<OrderFilters>>,
) {
  return useMemo(
    () => [
      {
        type: "text",
        name: "search",
        placeholder: includeRecipient ? "Search order or recipient..." : "Search order number...",
        value: filters.search ?? "",
        onChange: (search: string) => setFilters((current) => ({ ...current, search: search || undefined })),
      },
      {
        type: "select",
        showIcon: false,
        name: "status",
        placeholder: "Filter by status",
        value: filters.status ?? "",
        onChange: (status: OrderFilters["status"] | "") => setFilters((current) => ({ ...current, status: status || undefined })),
        options: [
          { value: "pending", label: "Pending" },
          { value: "approved", label: "Approved" },
          { value: "in_preparation", label: "In preparation" },
          { value: "purchased", label: "Purchased" },
          { value: "out_for_delivery", label: "Out for delivery" },
          { value: "delivered", label: "Delivered" },
          { value: "rejected", label: "Rejected" },
          { value: "cancelled", label: "Cancelled" },
        ],
      },
    ],
    [filters.search, filters.status, includeRecipient, setFilters],
  );
}
