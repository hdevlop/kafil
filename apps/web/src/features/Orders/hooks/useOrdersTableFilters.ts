"use client";

import { useMemo } from "react";

export function useOrdersTableFilters(includeRecipient: boolean) {
  return useMemo(
    () => [
      { type: "text", name: "orderNumber", placeholder: "Search order number..." },
      ...(includeRecipient
        ? [{
            type: "text",
            name: "guardianLegalNameSnapshot",
            placeholder: "Search recipient...",
          }]
        : []),
      {
        type: "select",
        name: "status",
        placeholder: "Filter by status",
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
    [includeRecipient],
  );
}
