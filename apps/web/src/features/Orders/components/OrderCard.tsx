"use client";

import { CalendarClock, MapPin, Package, Phone, ReceiptText, Truck } from "lucide-react";
import { NCard, NCardAction, NCardInfo, NCardSection } from "najm-kit";

import { formatKafilDate, formatMad } from "@/lib/format";
import { getFamilyAvatarImage } from "@/lib/personImages";
import { ManagedAvatar } from "@/shared/ManagedAvatar";
import { StatusBadge } from "@/shared/StatusBadge";
import { useKafilLanguage } from "@/i18n/KafilLanguageProvider";

import type { OrderRecord } from "../types";

export function OrderCard({
  data,
  highlighted = false,
}: Readonly<{ data: OrderRecord; highlighted?: boolean }>) {
  const { t } = useKafilLanguage();
  return (
    <NCard
      className={highlighted ? "border-primary ring-1 ring-primary/30" : undefined}
      data-highlighted={highlighted ? "true" : undefined}
      embedded
      title={data.orderNumber}
      description={formatMad(data.totalMinor)}
    >
      <NCardAction>
        <StatusBadge status={data.status} />
      </NCardAction>
      <NCardSection>
        <NCardInfo
          icon={ReceiptText}
          label="Source"
          value={
            data.placementSource === "operator_assisted"
              ? "Assisted"
              : "Self-service"
          }
        />
        <NCardInfo
          icon={ReceiptText}
          label="Family"
          value={
            <ManagedAvatar
              src={getFamilyAvatarImage(data.familyImage ?? null)}
              title={data.guardianLegalNameSnapshot}
              size="sm"
              classNames={{ avatar: "bg-muted" }}
            />
          }
        />
        <NCardInfo
          icon={Phone}
          label="Phone"
          value={data.deliveryPhoneSnapshot || "—"}
        />
        <NCardInfo icon={MapPin} label="Delivery address" value={data.deliveryAddressSnapshot} />
        <NCardInfo
          icon={Truck}
          label={t("operator.orders.delivery.column")}
          value={
            data.currentDelivery?.name ??
            (["failed", "cancelled"].includes(data.latestDelivery?.status ?? "")
              ? t("operator.orders.delivery.needsReassignment")
              : data.latestDelivery?.status === "delivered"
                ? data.latestDelivery.name
                : t("operator.orders.delivery.notAssigned"))
          }
        />
        <NCardInfo
          icon={Package}
          label="Articles"
          value={data.articleCount ?? "—"}
        />
        <NCardInfo icon={CalendarClock} label="Placed" value={formatKafilDate(data.createdAt)} />
      </NCardSection>
    </NCard>
  );
}
