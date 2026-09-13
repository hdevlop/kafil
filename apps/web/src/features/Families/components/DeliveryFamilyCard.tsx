"use client";

import { CalendarDays, ExternalLink, Package, Phone, PhoneOff } from "lucide-react";
import {
  NAvatar,
  NBadge,
  NButton,
  NCard,
  NCardInfo,
  NCardMedia,
  NCardSection,
  useNajmFormat,
} from "najm-kit";

import { getPersonImage } from "najm-kit/person-images";
import { useTranslation } from "najm-i18n/react";

import { minuteLabel } from "@/features/Dashboard/shared/deliveryTime";
import { mapsUrlForFamily } from "../hooks/useDeliveryFamiliesTableColumns";
import type { DeliveryFamilyView } from "../types";

export function DeliveryFamilyCard({ data }: Readonly<{ data: DeliveryFamilyView }>) {
  const { t } = useTranslation();
  const fmt = useNajmFormat();

  return (
    <NCard
      embedded
      title={data.familyName}
      description={t("dashboard.delivery.familiesOrdersCount", { count: fmt.number(data.orderCount) })}
      className="w-full overflow-hidden"
    >
      <NCardMedia variant="avatar" size="sm" className="w-20 sm:w-[var(--n-card-media-size)]">
        <NAvatar
          src={getPersonImage({ image: data.familyImage, role: "family" })}
          alt={data.familyName}
          size="xl"
          classNames={{ avatar: "size-20 bg-muted sm:size-16" }}
        />
      </NCardMedia>
      <NCardSection density="responsive" surface="responsive">
        <NCardInfo
          icon={data.phone ? Phone : PhoneOff}
          label={t("dashboard.delivery.familiesPhone")}
          value={
            data.phone ? (
              <a dir="ltr" className="underline-offset-4 hover:underline" href={`tel:${data.phone}`}>
                {data.phone}
              </a>
            ) : (
              "—"
            )
          }
        />
        <NCardInfo
          icon={Package}
          label={t("dashboard.delivery.familiesOrders")}
          value={fmt.number(data.orderCount)}
        />
        <NCardInfo
          icon={CalendarDays}
          label={t("dashboard.delivery.familiesNextWindow")}
          value={
            data.nextWindowStartMinute == null
              ? "—"
              : `${minuteLabel(data.nextWindowStartMinute)}–${minuteLabel(data.nextWindowEndMinute)}`
          }
        />
        <NCardInfo
          label={t("dashboard.delivery.familiesStatus")}
          value={
            <NBadge status={data.status}>
              {t(
                data.status === "needs_attention"
                  ? "dashboard.delivery.needsAttention"
                  : data.status === "delivered"
                    ? "dashboard.delivery.delivered"
                    : "dashboard.delivery.pending",
              )}
            </NBadge>
          }
        />
      </NCardSection>
      <div className="flex gap-2 px-4 pb-4">
        {data.phone ? (
          <NButton size="sm" variant="outline" asChild>
            <a href={`tel:${data.phone}`}>
              <Phone className="size-4" />
              {t("dashboard.delivery.callFamily")}
            </a>
          </NButton>
        ) : (
          <NButton size="sm" variant="outline" disabled>
            <PhoneOff className="size-4" />
            {t("dashboard.delivery.callFamily")}
          </NButton>
        )}
        <NButton size="sm" variant="outline" asChild>
          <a href={mapsUrlForFamily(data)} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="size-4" />
            {t("dashboard.delivery.openMaps")}
          </a>
        </NButton>
      </div>
    </NCard>
  );
}
