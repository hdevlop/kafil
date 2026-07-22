"use client";

import { useMemo } from "react";
import { type NTableProps } from "najm-kit";

import { formatKafilDate, formatMad, formatStatusLabel } from "@/lib/format";

import type { FamilyBudgetLedgerEntry } from "../types";

export function useFamilyBudgetLedgerColumns() {
  return useMemo<NTableProps<FamilyBudgetLedgerEntry>["columns"]>(
    () => [
      {
        accessorKey: "amountMinor",
        header: "Amount",
        cell: ({ getValue }) => formatMad(getValue<number>()),
      },
      {
        accessorKey: "entryType",
        header: "Entry",
        cell: ({ getValue }) => formatStatusLabel(getValue<string>()),
      },
      {
        accessorKey: "availableAfterMinor",
        header: "Available after",
        cell: ({ getValue }) => formatMad(getValue<number>()),
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
