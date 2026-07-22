"use client";

import { useMemo } from "react";
import { type NTableProps } from "najm-kit";

import {
  formatKafilDate,
  formatKafilNumber,
  formatStatusLabel,
} from "@/lib/format";

import type { InventoryLedgerEntry } from "../types";

export function useInventoryLedgerTableColumns() {
  return useMemo<NTableProps<InventoryLedgerEntry>["columns"]>(
    () => [
      {
        accessorKey: "entryType",
        header: "Entry",
        cell: ({ getValue }) => formatStatusLabel(getValue<string>()),
      },
      {
        accessorKey: "quantity",
        header: "Quantity",
        cell: ({ getValue }) => formatKafilNumber(getValue<number>()),
      },
      {
        accessorKey: "onHandAfter",
        header: "On hand after",
        cell: ({ getValue }) => formatKafilNumber(getValue<number>()),
      },
      {
        accessorKey: "reservedAfter",
        header: "Reserved after",
        cell: ({ getValue }) => formatKafilNumber(getValue<number>()),
      },
      {
        accessorKey: "reason",
        header: "Reason",
        cell: ({ getValue }) => getValue<string | null>() || "—",
      },
      {
        accessorKey: "createdAt",
        header: "Recorded",
        cell: ({ getValue }) => formatKafilDate(getValue<string>()),
      },
    ],
    [],
  );
}
