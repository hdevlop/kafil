"use client";

import { useMemo } from "react";

export function useChildrenTableFilters() {
  return useMemo(
    () => [
      {
        type: "text",
        name: "legalName",
        placeholder: "Search child name...",
      },
      {
        type: "select",
        name: "gender",
        placeholder: "Filter by gender",
        options: [
          { value: "F", label: "Female" },
          { value: "M", label: "Male" },
        ],
      },
      {
        type: "select",
        name: "status",
        placeholder: "Filter by status",
        options: [
          { value: "active", label: "Active" },
          { value: "inactive", label: "Inactive" },
        ],
      },
    ],
    [],
  );
}
