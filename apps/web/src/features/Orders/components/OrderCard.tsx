"use client";

import {
  CalendarClock,
  MapPin,
  Package,
  Phone,
  ShoppingBag,
  Truck,
} from "lucide-react";
import {
  NAvatar,
  NBadge,
  NCard,
  NCardInfo,
  NCardSection,
  useNajmFormat,
} from "najm-kit";
import { getPersonImage } from "najm-kit/person-images";

import { useKafilLanguage } from "@/i18n/useKafilLanguage";
import { NNextImage } from "najm-kit/next";
import { Operator, useKafilRole } from "@/shared/Authorization";

export interface OrderCardData {
  orderNumber: string;
  status: string;
  totalMinor: number;
  createdAt?: string;
  placedAt?: string;
  guardianLegalNameSnapshot?: string;
  familyImage?: string | null;
  deliveryPhoneSnapshot?: string | null;
  deliveryAddressSnapshot?: string;
  currentDelivery?: { name: string } | null;
  latestDelivery?: { name: string; status: string } | null;
  deliveryName?: string | null;
  deliveryStatus?: string | null;
  articleCount?: number;
  requestedTotalMinor?: number;
  actualTotalMinor?: number | null;
  merchantName?: string | null;
  dominantCategoryName?: string | null;
  dominantCategoryImage?: string | null;
}

export function OrderCard({ data, highlighted = false, actions }: Readonly<{
  data: OrderCardData;
  highlighted?: boolean;
  actions?: React.ReactNode;
}>) {
  const { t } = useKafilLanguage();
  const fmt = useNajmFormat();
  const { isExactFamily, isExactSponsor } = useKafilRole();
  const placedAt = data.createdAt ?? data.placedAt;
  const isManagement = !isExactFamily && !isExactSponsor;
  const deliveryName = isManagement
    ? data.currentDelivery?.name ?? (data.latestDelivery?.status === "delivered" ? data.latestDelivery.name : null)
    : data.deliveryName ?? null;
  const deliveryStatus = isManagement ? data.latestDelivery?.status : data.deliveryStatus;
  const deliveryValue = deliveryName ??
    (["failed", "cancelled"].includes(deliveryStatus ?? "")
      ? t("operator.orders.delivery.needsReassignment")
      : t("operator.orders.delivery.notAssigned"));
  const total = data.actualTotalMinor ?? data.totalMinor;

  return (
    <NCard
      className={highlighted ? "border-primary ring-1 ring-primary/30" : undefined}
      data-highlighted={highlighted ? "true" : undefined}
      embedded
      title={
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted text-muted-foreground">
            {data.dominantCategoryImage ? (
              <NNextImage unoptimized src={data.dominantCategoryImage} alt={data.dominantCategoryName ?? t("common.orderCategory")} width={48} height={48} className="size-full object-contain" />
            ) : <ShoppingBag aria-hidden="true" className="size-5" />}
          </span>
          <span className="min-w-0">
            <span className="block truncate font-semibold">{data.orderNumber}</span>
            <span className="block text-sm font-medium text-muted-foreground">{fmt.money(total)}</span>
          </span>
        </div>
      }
    >
      <NCardSection className="gap-1.5">
        <Operator>
          {data.guardianLegalNameSnapshot ? (
            <div className="flex min-w-0 items-center gap-2">
              <NAvatar
                alt={data.guardianLegalNameSnapshot}
                src={getPersonImage({ image: data.familyImage ?? null, role: "family" })}
                title={data.guardianLegalNameSnapshot}
                size="sm"
                className="shrink-0"
                classNames={{ avatar: "bg-muted" }}
              />
              <span className="min-w-0 truncate text-sm font-medium">
                {data.guardianLegalNameSnapshot}
              </span>
            </div>
          ) : null}
          {data.deliveryPhoneSnapshot ? <NCardInfo icon={Phone} label={t("common.orderPhone")} value={data.deliveryPhoneSnapshot} /> : null}
          {data.deliveryAddressSnapshot ? <NCardInfo icon={MapPin} label={t("common.orderDeliveryAddress")} value={data.deliveryAddressSnapshot} /> : null}
        </Operator>
        <NCardInfo icon={Truck} label={t("operator.orders.delivery.column")} value={deliveryValue} />
        {data.articleCount !== undefined ? <NCardInfo icon={Package} label={t("common.orderArticles")} value={data.articleCount} /> : null}
        <div className="flex items-center justify-between gap-3">
          {placedAt ? <NCardInfo icon={CalendarClock} label={t("common.orderPlaced")} value={fmt.date(placedAt)} /> : <span />}
          <NBadge status={data.status} />
        </div>
      </NCardSection>
      {actions ? <NCardSection className="flex-row flex-wrap justify-end gap-2">{actions}</NCardSection> : null}
    </NCard>
  );
}
