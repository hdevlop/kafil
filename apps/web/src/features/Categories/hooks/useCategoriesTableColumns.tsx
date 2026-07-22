"use client";

import { useMemo } from "react";
import { type NTableProps } from "najm-kit";

import { formatKafilDate } from "@/lib/format";
import { StatusBadge } from "@/shared/StatusBadge";

import type { CategoryRecord } from "../types";

export function useCategoriesTableColumns() {
  return useMemo<NTableProps<CategoryRecord>["columns"]>(
    () => [
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
