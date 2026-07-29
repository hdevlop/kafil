"use client";

import { useMemo } from "react";
import { type NTableProps } from "najm-kit";

import { formatKafilDate, formatMad } from "@/lib/format";
import { getFamilyAvatarImage } from "@/lib/personImages";
import { ManagedAvatar } from "@/shared/ManagedAvatar";
import { StatusBadge } from "@/shared/StatusBadge";

import type { OrderRecord } from "../types";

export function useOrdersTableColumns() {
  return useMemo<NTableProps<OrderRecord>["columns"]>(
    () => [
      {
        accessorKey: "orderNumber",
        header: "Order number",
        cell: ({ getValue }) => (
          <p className="truncate font-medium">{getValue<string>()}</p>
        ),
      },
      {
        accessorKey: "guardianLegalNameSnapshot",
        header: "Family",
        cell: ({ row }) => (
          <ManagedAvatar
            src={getFamilyAvatarImage(row.original.familyImage ?? null)}
            title={row.original.guardianLegalNameSnapshot}
            classNames={{ avatar: "bg-muted" }}
          />
        ),
      },
      {
        accessorKey: "deliveryPhoneSnapshot",
        header: "Phone",
        cell: ({ getValue }) => getValue<string | null>() || "—",
      },
      {
        accessorKey: "articleCount",
        header: "Articles",
        cell: ({ getValue }) => getValue<number | undefined>() ?? "—",
      },
      {
        accessorKey: "placementSource",
        header: "Source",
        cell: ({ getValue }) =>
          getValue<string>() === "operator_assisted"
            ? "Assisted"
            : "Self-service",
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
