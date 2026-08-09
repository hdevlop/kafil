"use client";

import { useMemo } from "react";
import { useNajmFormat, type NTableProps } from "najm-kit";

import { StatusBadge } from "@/shared/StatusBadge";

import type { ProductRecord } from "../types";

export const PRODUCT_TABLE_COLUMN_IDS = {
  categoryName: "categoryName",
  name: "name",
  priceMinor: "priceMinor",
  sku: "sku",
  status: "status",
  updatedAt: "updatedAt",
} as const;

export function useProductsTableColumns() {
  const fmt = useNajmFormat();
  return useMemo<NTableProps<ProductRecord>["columns"]>(() => {
    return [
      {
        accessorKey: PRODUCT_TABLE_COLUMN_IDS.name,
        header: "Product",
        cell: ({ getValue }) => (
          <p className="truncate font-medium">{getValue<string>()}</p>
        ),
      },
      {
        accessorKey: PRODUCT_TABLE_COLUMN_IDS.sku,
        header: "SKU",
      },
      {
        accessorKey: PRODUCT_TABLE_COLUMN_IDS.categoryName,
        header: "Category",
      },
      {
        accessorKey: PRODUCT_TABLE_COLUMN_IDS.priceMinor,
        header: "Price",
        cell: ({ getValue }) => fmt.money(getValue<number>()),
      },
      {
        accessorKey: PRODUCT_TABLE_COLUMN_IDS.status,
        header: "Status",
        cell: ({ getValue }) => <StatusBadge status={getValue<string>()} />,
      },
      {
        accessorKey: PRODUCT_TABLE_COLUMN_IDS.updatedAt,
        header: "Updated",
        cell: ({ getValue }) => fmt.date(getValue<string>()),
      },
    ];
  }, [fmt]);
}
