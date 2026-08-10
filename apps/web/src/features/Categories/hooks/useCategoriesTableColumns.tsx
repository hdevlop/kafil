"use client";

import { useMemo } from "react";
import { NBadge, useNajmFormat, type NTableProps } from "najm-kit";


import type { CategoryRecord } from "../types";

export function useCategoriesTableColumns() {
  const fmt = useNajmFormat();
  return useMemo<NTableProps<CategoryRecord>["columns"]>(() => {
    return [
      {
        accessorKey: "name",
        header: "Category",
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="truncate font-medium">{row.original.name}</p>
            <p className="truncate text-sm text-muted-foreground">{row.original.slug}</p>
          </div>
        ),
      },
      {
        accessorKey: "sortOrder",
        header: "Order",
        cell: ({ getValue }) => getValue<number>(),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ getValue }) => <NBadge status={getValue<string>()} />,
      },
      {
        accessorKey: "updatedAt",
        header: "Updated",
        cell: ({ getValue }) => fmt.date(getValue<string>()),
      },
    ];
  }, [fmt]);
}
