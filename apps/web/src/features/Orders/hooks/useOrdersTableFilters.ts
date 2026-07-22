"use client";

import { useMemo } from "react";

export function useOrdersTableFilters() {
  return useMemo(
    () => [
      { type: "text", name: "orderNumber", placeholder: "Search order number..." },
      {
        type: "text",
        name: "guardianLegalNameSnapshot",
        placeholder: "Search recipient...",
      },
      {
        type: "select",
        name: "status",
        placeholder: "Filter by status",
        options: [
          { value: "pending", label: "Pending" },
          { value: "approved", label: "Approved" },
          { value: "in_preparation", label: "In preparation" },
          { value: "delivered", label: "Delivered" },
          { value: "rejected", label: "Rejected" },
          { value: "cancelled", label: "Cancelled" },
        ],
      },
    ],
    [],
  );
}
