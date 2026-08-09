"use client";

import type { LatestOrdersCardProps } from "@/features/Dashboard";
import { useKafilLanguage } from "@/i18n/useKafilLanguage";
import { ManagedAvatar } from "@/shared/ManagedAvatar";
import { StatusBadge } from "@/shared/StatusBadge";
import { ArrowRight, ClipboardList } from "lucide-react";
import { NButton, NCard, NCardAction, useNajmFormat } from "najm-kit";
import { getPersonImage } from "najm-kit/person-images";
import Link from "next/link";

export function LatestOrdersCard({ recentOrders }: Readonly<LatestOrdersCardProps>) {

  const { t } = useKafilLanguage();
  const fmt = useNajmFormat();

  return (
    <NCard className="h-full" icon={ClipboardList} title={t("dashboard.operator.latestOrders")}>
      <NCardAction>
        <NButton asChild size="2xs" variant="ghost">
          <Link href="/orders">
            {t("dashboard.operator.viewAll")}
            <ArrowRight aria-hidden="true" className="size-3.5 rtl:rotate-180" />
          </Link>
        </NButton>
      </NCardAction>

      {recentOrders.length ? (
        <div className="divide-y divide-border/70">
          {recentOrders.map((order, index) => {
            const previous = index > 0 ? recentOrders[index - 1] : undefined;
            const isRepeatedFamily = previous?.familyName === order.familyName;
            return (
              <Link className="flex items-center gap-2.5 py-2.5 first:pt-0 last:pb-0 hover:text-primary" href="/orders"  key={order.id}>
                {isRepeatedFamily ? (
                  <span aria-hidden className="size-12 shrink-0" />
                ) : (
                  <ManagedAvatar
                    alt={order.familyName}
                    className="shrink-0"
                    size="lg"
                    src={getPersonImage({ image: order.familyImage, role: "family" })}
                  />
                )}
                <span className="grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)_auto] gap-2">
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{order.orderNumber}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {order.familyName} · {fmt.date(order.placedAt)}
                    </span>
                  </span>
                  <span className="flex min-w-0 flex-col items-end gap-1">
                    <span className="text-xs font-semibold tabular-nums">{fmt.money(order.totalMinor)}</span>
                    <StatusBadge size="sm" status={order.status} />
                  </span>
                </span>
              </Link>
            );
          })}
        </div>
      ) : (
        <p className="py-10 text-center text-sm text-muted-foreground">
          {t("dashboard.operator.noRecentOrders")}
        </p>
      )}
    </NCard>
  );
}
