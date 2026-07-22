"use client";

import { CalendarDays, MapPin, PackageCheck, ReceiptText, Route } from "lucide-react";
import { NCard, NDetailList, NSection } from "najm-kit";

import { formatKafilDate, formatKafilNumber, formatMad, formatStatusLabel } from "@/lib/format";
import { PageErrorState } from "@/shared/PageState";
import { StatusBadge } from "@/shared/StatusBadge";

import { useOrder } from "../hooks/useOrders";

export function OrderDetails({ orderId }: Readonly<{ orderId: string }>) {
  const order = useOrder(orderId);

  if (order.isPending) {
    return <NCard title="Loading order details" description="Retrieving the protected fulfillment snapshot and timeline." loading />;
  }

  if (order.isError) {
    return <PageErrorState error={order.error} title="We could not load this order" onRetry={() => void order.refetch()} />;
  }

  if (!order.data) return null;

  const data = order.data;

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4 rounded-2xl bg-muted/60 p-4">
        <div className="min-w-0">
          <p className="truncate text-xl font-semibold">{data.orderNumber}</p>
          <p className="text-sm text-muted-foreground">{formatMad(data.totalMinor)}</p>
        </div>
        <StatusBadge status={data.status} />
      </div>

      <NSection icon={PackageCheck} title="Fulfillment">
        <NDetailList
          items={[
            { label: "Placed", value: formatKafilDate(data.createdAt) },
            { label: "Approved", value: formatKafilDate(data.approvedAt) },
            { label: "Preparation started", value: formatKafilDate(data.preparationStartedAt) },
            { label: "Delivered", value: formatKafilDate(data.deliveredAt) },
            { label: "Rejection reason", value: data.rejectionReason || "Not rejected" },
            { label: "Cancellation reason", value: data.cancellationReason || "Not cancelled" },
          ]}
        />
      </NSection>

      <NSection icon={MapPin} title="Protected delivery snapshot">
        <NDetailList
          items={[
            { label: "Recipient", value: data.guardianLegalNameSnapshot },
            { label: "Address", value: data.deliveryAddressSnapshot },
            { label: "Phone", value: data.deliveryPhoneSnapshot || "Not provided" },
          ]}
        />
      </NSection>

      <NSection icon={ReceiptText} title="Order items">
        <NDetailList
          items={data.items.map((item) => ({
            label: `${item.productNameSnapshot} (${item.skuSnapshot}) Ã— ${formatKafilNumber(item.quantity)}`,
            value: formatMad(item.lineTotalMinor),
          }))}
        />
      </NSection>

      <NSection icon={Route} title="Status timeline">
        <NDetailList
          items={data.statusEvents.map((event) => ({
            label: `${event.fromStatus ? `${formatStatusLabel(event.fromStatus)} â†’ ` : ""}${formatStatusLabel(event.toStatus)}`,
            value: `${formatKafilDate(event.createdAt)}${event.reason ? ` â€” ${event.reason}` : ""}`,
          }))}
        />
      </NSection>

      <NSection icon={CalendarDays} title="Record">
        <NDetailList
          items={[
            { label: "Last updated", value: formatKafilDate(data.updatedAt) },
            { label: "Household reference", value: data.familyProfileId.slice(0, 8) },
          ]}
        />
      </NSection>
    </div>
  );
}
