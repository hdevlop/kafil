"use client";

import { useMemo } from "react";
import {
  NAvatar,
  NBadge,
  useNajmFormat,
  type NTableProps,
} from "najm-kit";
import { getPersonImage } from "najm-kit/person-images";

import { useTranslation } from "najm-i18n/react";

import type { DeliveryFamilyView } from "../types";

export function mapsUrlForFamily(family: DeliveryFamilyView): string {
  const query = family.coordinates
    ? `${family.coordinates.latitude},${family.coordinates.longitude}`
    : family.address;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export function useDeliveryFamiliesTableColumns() {
  const { t } = useTranslation();
  const fmt = useNajmFormat();
  return useMemo<NTableProps<DeliveryFamilyView>["columns"]>(() => {
    return [
      {
        accessorKey: "familyName",
        header: t("dashboard.delivery.familiesAccount"),
        cell: ({ row }) => (
          <NAvatar
            src={getPersonImage({ image: row.original.familyImage, role: "family" })}
            title={row.original.familyName}
            classNames={{ avatar: "bg-muted" }}
          />
        ),
      },
      {
        accessorKey: "phone",
        header: t("dashboard.delivery.familiesPhone"),
        cell: ({ row }) =>
          row.original.phone ? (
            <a dir="ltr" className="text-start underline-offset-4 hover:underline" href={`tel:${row.original.phone}`}>
              {row.original.phone}
            </a>
          ) : (
            "—"
          ),
      },
      {
        accessorKey: "orderCount",
        header: t("dashboard.delivery.familiesOrders"),
        cell: ({ getValue }) => fmt.number(getValue<number>()),
      },
      {
        accessorKey: "status",
        header: t("dashboard.delivery.familiesStatus"),
        cell: ({ row }) => (
          <NBadge status={row.original.status}>
            {t(
              row.original.status === "needs_attention"
                ? "dashboard.delivery.needsAttention"
                : row.original.status === "delivered"
                  ? "dashboard.delivery.delivered"
                  : "dashboard.delivery.pending",
            )}
          </NBadge>
        ),
      },
    ];
  }, [fmt, t]);
}
