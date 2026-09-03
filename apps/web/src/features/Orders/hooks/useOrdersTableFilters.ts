"use client";

import { useMemo, type Dispatch, type SetStateAction } from "react";
import { useKafilLanguage } from "@/i18n/useKafilLanguage";
import type { OrderListQuery } from "../types";

type OrderFilters = Omit<OrderListQuery, "limit" | "offset">;

export function useOrdersTableFilters(
  includeRecipient: boolean,
  filters: OrderFilters,
  setFilters: Dispatch<SetStateAction<OrderFilters>>,
) {
  const { t } = useKafilLanguage();
  return useMemo(
    () => [
      {
        type: "text",
        name: "search",
        placeholder: includeRecipient
          ? t("operator.orders.searchOrderOrRecipient")
          : t("operator.orders.searchOrderNumber"),
        value: filters.search ?? "",
        onChange: (search: string) => setFilters((current) => ({ ...current, search: search || undefined })),
      },
      {
        type: "select",
        showIcon: false,
        name: "status",
        placeholder: t("operator.orders.filterStatus"),
        value: filters.status ?? "",
        onChange: (status: OrderFilters["status"] | "") => setFilters((current) => ({ ...current, status: status || undefined })),
        options: [
          { value: "pending", label: t("status.pending") },
          { value: "approved", label: t("status.approved") },
          { value: "in_preparation", label: t("status.in_preparation") },
          { value: "purchased", label: t("status.purchased") },
          { value: "out_for_delivery", label: t("status.out_for_delivery") },
          { value: "delivered", label: t("status.delivered") },
          { value: "rejected", label: t("status.rejected") },
          { value: "cancelled", label: t("status.cancelled") },
        ],
      },
    ],
    [filters.search, filters.status, includeRecipient, setFilters, t],
  );
}
