"use client";

import type { LucideIcon } from "lucide-react";
import { NBadge, NCard, useNajmFormat } from "najm-kit";
import Link from "next/link";
import type { ReactNode } from "react";


import type { OrderEntry } from "../../types";

export function RecentSupportedOrdersCard({
  orders,
  icon,
  title,
  emptyLabel,
  itemsLabel,
  footer,
  rowHref,
}: Readonly<{
  orders: OrderEntry[];
  icon: LucideIcon;
  title: string;
  emptyLabel: string;
  itemsLabel: string;
  footer?: ReactNode;
  rowHref?: string;
}>) {
  const fmt = useNajmFormat();
  const money = (value: number) => fmt.money(value);

  const orderRow = (order: OrderEntry) => (
    <span className="min-w-0">
      <span className="block truncate text-sm font-semibold">{order.orderNumber}</span>
      <span className="block text-xs text-muted-foreground">
        {fmt.number(order.itemCount)} {itemsLabel} · {fmt.date(order.placedAt)}
      </span>
    </span>
  );

  return (
    <NCard
      className="h-full"
      empty={orders.length === 0}
      emptyText={emptyLabel}
      icon={icon}
      title={title}
    >
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
                    <NBadge status={order.status} />
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
                    <NBadge status={order.status} />
                  </span>
                </div>
              )
            ))}
          </div>
          {footer}
        </>
      ) : null}
    </NCard>
  );
}
