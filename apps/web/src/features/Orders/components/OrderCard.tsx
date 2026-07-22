"use client";

import { CalendarClock, MapPin, ReceiptText } from "lucide-react";
import { NCard, NCardAction, NCardInfo, NCardSection } from "najm-kit";

import { formatKafilDate, formatMad } from "@/lib/format";
import { StatusBadge } from "@/shared/StatusBadge";

import type { OrderRecord } from "../types";

export function OrderCard({ data }: Readonly<{ data: OrderRecord }>) {
  return (
    <NCard
      embedded
      title={data.orderNumber}
      description={formatMad(data.totalMinor)}
    >
      <NCardAction>
        <StatusBadge status={data.status} />
      </NCardAction>
      <NCardSection>
        <NCardInfo icon={ReceiptText} label="Recipient" value={data.guardianLegalNameSnapshot} />
        <NCardInfo icon={MapPin} label="Delivery address" value={data.deliveryAddressSnapshot} />
        <NCardInfo icon={CalendarClock} label="Placed" value={formatKafilDate(data.createdAt)} />
      </NCardSection>
    </NCard>
  );
}
