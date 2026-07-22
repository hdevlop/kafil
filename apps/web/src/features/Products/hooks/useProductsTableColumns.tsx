"use client";

import { useMemo } from "react";
import { type NTableProps } from "najm-kit";

import { formatKafilDate, formatMad } from "@/lib/format";
import { StatusBadge } from "@/shared/StatusBadge";

import type { ProductRecord } from "../types";

export function useProductsTableColumns() {
  return useMemo<NTableProps<ProductRecord>["columns"]>(
    () => [
      {
        accessorKey: "name",
        header: "Product",
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="truncate font-medium">{row.original.name}</p>
            <p className="truncate text-sm text-muted-foreground">{row.original.sku}</p>
          </div>
        ),
      },
      {
        accessorKey: "categoryName",
        header: "Category",
      },
      {
        accessorKey: "priceMinor",
        header: "Price",
        cell: ({ getValue }) => formatMad(getValue<number>()),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ getValue }) => <StatusBadge status={getValue<string>()} />,
      },
      {
        accessorKey: "updatedAt",
        header: "Updated",
        cell: ({ getValue }) => formatKafilDate(getValue<string>()),
      },
    ],
    [],
  );
}
