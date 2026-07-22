"use client";

import { useMemo } from "react";
import { type NTableProps } from "najm-kit";

import { formatKafilDate, formatMad } from "@/lib/format";
import { StatusBadge } from "@/shared/StatusBadge";

import type { OrderRecord } from "../types";

export function useOrdersTableColumns() {
  return useMemo<NTableProps<OrderRecord>["columns"]>(
    () => [
      {
        accessorKey: "orderNumber",
        header: "Order",
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="truncate font-medium">{row.original.orderNumber}</p>
            <p className="truncate text-sm text-muted-foreground">
              {row.original.guardianLegalNameSnapshot}
            </p>
          </div>
        ),
      },
      {
        accessorKey: "totalMinor",
        header: "Total",
        cell: ({ getValue }) => formatMad(getValue<number>()),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ getValue }) => <StatusBadge status={getValue<string>()} />,
      },
      {
        accessorKey: "createdAt",
        header: "Placed",
        cell: ({ getValue }) => formatKafilDate(getValue<string>()),
      },
    ],
    [],
  );
}
