"use client";

import { useMemo } from "react";
import {
  NAvatar,
  NBadge,
  useNajmFormat,
  type NTableProps,
} from "najm-kit";
import { getPersonImage } from "najm-kit/person-images";

import { useKafilLanguage } from "@/i18n/useKafilLanguage";

import type { OrderRecord } from "../types";

export function useOrdersTableColumns(
  onDelivery?: (order: OrderRecord) => void,
) {
  const { t } = useKafilLanguage();
  const fmt = useNajmFormat();
  return useMemo<NTableProps<OrderRecord>["columns"]>(() => {
    return [
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
          <NAvatar
            src={getPersonImage({ image: row.original.familyImage ?? null, role: "family" })}
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
        cell: ({ getValue }) => fmt.money(getValue<number>()),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ getValue }) => <NBadge status={getValue<string>()} />,
      },
      {
        id: "delivery",
        header: t("operator.orders.delivery.column"),
        enableSorting: false,
        cell: ({ row }) => {
          const order = row.original;
          const label = order.currentDelivery
            ? `${order.currentDelivery.name}${order.currentDelivery.status === "in_progress" ? ` · ${t("operator.orders.delivery.inProgress")}` : ""}`
            : ["failed", "cancelled"].includes(
                  order.latestDelivery?.status ?? "",
                )
              ? t("operator.orders.delivery.needsReassignment")
              : order.latestDelivery?.status === "delivered"
                ? order.latestDelivery.name
                : t("operator.orders.delivery.notAssigned");
          return (
            <button
              type="button"
              className="max-w-48 truncate text-start text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={`View delivery for ${order.orderNumber}: ${label}`}
              onClick={(event) => {
                event.stopPropagation();
                onDelivery?.(order);
              }}
            >
              {label}
            </button>
          );
        },
      },
      {
        accessorKey: "createdAt",
        header: "Placed",
        cell: ({ getValue }) => fmt.date(getValue<string>()),
      },
    ];
  }, [fmt, onDelivery, t]);
}
