"use client";

import { useMemo } from "react";
import { type NTableProps } from "najm-kit";

import { formatKafilDate, formatMad } from "@/lib/format";
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
  return useMemo<NTableProps<ProductRecord>["columns"]>(
    () => [
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
        cell: ({ getValue }) => formatMad(getValue<number>()),
      },
      {
        accessorKey: PRODUCT_TABLE_COLUMN_IDS.status,
        header: "Status",
        cell: ({ getValue }) => <StatusBadge status={getValue<string>()} />,
      },
      {
        accessorKey: PRODUCT_TABLE_COLUMN_IDS.updatedAt,
        header: "Updated",
        cell: ({ getValue }) => formatKafilDate(getValue<string>()),
      },
    ],
    [],
  );
}
