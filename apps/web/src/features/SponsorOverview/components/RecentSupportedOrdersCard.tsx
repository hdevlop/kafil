"use client";

import type { LucideIcon } from "lucide-react";
import { NCard } from "najm-kit";
import Link from "next/link";
import type { ReactNode } from "react";

import { formatKafilDate, formatKafilNumber, formatMad, type KafilLanguage } from "@/lib/format";
import { StatusBadge } from "@/shared/StatusBadge";

import type { OrderEntry } from "../types";

export function RecentSupportedOrdersCard({
  orders,
  icon,
  title,
  emptyLabel,
  language,
  itemsLabel,
  footer,
  rowHref,
}: Readonly<{
  orders: OrderEntry[];
  icon: LucideIcon;
  title: string;
  emptyLabel: string;
  language: KafilLanguage;
  itemsLabel: string;
  footer?: ReactNode;
  rowHref?: string;
}>) {
  const money = (value: number) => formatMad(value, language);
  const number = (value: number) => formatKafilNumber(value, language);

  const orderRow = (order: OrderEntry) => (
    <span className="min-w-0">
      <span className="block truncate text-sm font-semibold">{order.orderNumber}</span>
      <span className="block text-xs text-muted-foreground">
        {number(order.itemCount)} {itemsLabel} · {formatKafilDate(order.placedAt, language)}
      </span>
    </span>
  );

  return (
    <NCard className="h-full" icon={icon} title={title}>
      {orders.length > 0 ? (
        <>
          <div className="space-y-2">
            {orders.map((order) => (
              rowHref ? (
                <Link
                  className="flex items-center justify-between gap-3 rounded-xl border border-border/70 p-3 hover:bg-muted/60"
                  href={rowHref}
                  key={order.id}
                >
                  {orderRow(order)}
                  <span className="flex shrink-0 items-center gap-2">
                    <span className="text-sm font-semibold tabular-nums">{money(order.totalMinor)}</span>
                    <StatusBadge status={order.status} />
                  </span>
                </Link>
              ) : (
                <div
                  className="flex items-center justify-between gap-3 rounded-xl border border-border/70 p-3"
                  key={order.id}
                >
                  {orderRow(order)}
                  <span className="flex shrink-0 items-center gap-2">
                    <span className="text-sm font-semibold tabular-nums">{money(order.totalMinor)}</span>
                    <StatusBadge status={order.status} />
                  </span>
                </div>
              )
            ))}
          </div>
          {footer}
        </>
      ) : (
        <p className="py-10 text-center text-sm text-muted-foreground">{emptyLabel}</p>
      )}
    </NCard>
  );
}
