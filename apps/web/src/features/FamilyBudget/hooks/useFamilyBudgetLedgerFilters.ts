"use client";

import { useMemo } from "react";

export function useFamilyBudgetLedgerFilters() {
  return useMemo(
    () => [
      { type: "text", name: "entryType", placeholder: "Search entry type..." },
      { type: "text", name: "sourceType", placeholder: "Search source..." },
    ],
    [],
  );
}
