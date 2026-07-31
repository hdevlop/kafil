"use client";

import {
  CalendarDays,
  MapPin,
  PackageCheck,
  ReceiptText,
  Route,
  Truck,
} from "lucide-react";
import { NCard, NDetailList, NSection } from "najm-kit";

import {
  formatKafilDate,
  formatKafilNumber,
  formatMad,
  formatStatusLabel,
} from "@/lib/format";
import { PageErrorState } from "@/shared/PageState";
import { StatusBadge } from "@/shared/StatusBadge";

import { useOrder } from "../hooks/useOrders";

export function OrderDetails({ orderId }: Readonly<{ orderId: string }>) {
  const order = useOrder(orderId);

  if (order.isPending) {
    return (
      <NCard
        title="Loading order details"
        description="Retrieving the protected fulfillment snapshot and timeline."
        loading
      />
    );
  }

  if (order.isError) {
    return (
      <PageErrorState
        error={order.error}
        title="We could not load this order"
        onRetry={() => void order.refetch()}
      />
    );
  }

  if (!order.data) return null;
  const data = order.data;

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4 rounded-2xl bg-muted/60 p-4">
        <div className="min-w-0">
          <p className="truncate text-xl font-semibold">{data.orderNumber}</p>
          <p className="text-sm text-muted-foreground">
            Requested {formatMad(data.totalMinor)}
            {data.actualTotalMinor !== null
              ? ` · Actual ${formatMad(data.actualTotalMinor)}`
              : ""}
          </p>
        </div>
        <StatusBadge status={data.status} />
      </div>

      <NSection icon={PackageCheck} title="Accountable fulfillment">
        <NDetailList
          items={[
            { label: "Placed", value: formatKafilDate(data.createdAt) },
            {
              label: "Placement",
              value:
                data.placementSource === "operator_assisted"
                  ? "Operator assisted"
                  : "Family self-service",
            },
            {
              label: "Request channel",
              value: data.assistanceChannel || "Not assisted",
            },
            {
              label: "Private assistance note",
              value: data.assistanceNote || "No note",
            },
            { label: "Approved", value: formatKafilDate(data.approvedAt) },
            {
              label: "Purchase recorded",
              value: formatKafilDate(data.activePurchase?.purchasedAt),
            },
            {
              label: "Delivery started",
              value: formatKafilDate(data.deliveryStartedAt),
            },
            { label: "Delivered", value: formatKafilDate(data.deliveredAt) },
            {
              label: "Rejection reason",
              value: data.rejectionReason || "Not rejected",
            },
            {
              label: "Cancellation reason",
              value: data.cancellationReason || "Not cancelled",
            },
          ]}
        />
      </NSection>

      {data.activePurchase ? (
        <NSection icon={ReceiptText} title="Purchase and receipt">
          <NDetailList
            items={[
              { label: "Merchant", value: data.activePurchase.merchantName },
              {
                label: "Requested total",
                value: formatMad(data.requestedTotalMinor),
              },
              {
                label: "Actual total",
                value: formatMad(data.activePurchase.actualTotalMinor),
              },
              {
                label: "Difference",
                value: formatMad(
                  data.activePurchase.actualTotalMinor -
                    data.requestedTotalMinor,
                ),
              },
              {
                label: "Receipt number",
                value: data.activePurchase.receiptNumber || "Not recorded",
              },
              {
                label: "Protected receipt",
                value: (
                  <a
                    className="text-primary underline"
                    href={data.activePurchase.receiptStoragePath}
                    rel="noreferrer"
                    target="_blank"
                  >
                    Open receipt
                  </a>
                ),
              },
            ]}
          />
        </NSection>
      ) : null}

      <NSection icon={Truck} title="Delivery">
        <NDetailList
          items={[
            {
              label: "Assigned staff",
              value:
                data.currentDelivery?.deliveryNameSnapshot ||
                (data.deliveryAttempts.length ? "No active assignment" : "Not assigned"),
            },
            {
              label: "Operational phone",
              value: data.currentDelivery?.deliveryPhoneSnapshot || "Not available",
            },
            {
              label: "Started",
              value: formatKafilDate(data.deliveryStartedAt),
            },
            {
              label: "Recorded attempts",
              value: String(data.deliveryAttempts.length),
            },
            {
              label: "Confirmation method",
              value: data.deliveryConfirmationMethod || "Not confirmed",
            },
            {
              label: "Private note",
              value: data.deliveryNote || "No note",
            },
            {
              label: "Protected proof",
              value: data.deliveryProofStoragePath ? (
                <a
                  className="text-primary underline"
                  href={data.deliveryProofStoragePath}
                  rel="noreferrer"
                  target="_blank"
                >
                  Open proof
                </a>
              ) : (
                "No proof recorded"
              ),
            },
          ]}
        />
      </NSection>

      <NSection icon={MapPin} title="Protected delivery snapshot">
        <NDetailList
          items={[
            { label: "Recipient", value: data.guardianLegalNameSnapshot },
            { label: "Address", value: data.deliveryAddressSnapshot },
            {
              label: "Phone",
              value: data.deliveryPhoneSnapshot || "Not provided",
            },
          ]}
        />
      </NSection>

      <NSection icon={ReceiptText} title="Order items">
        <NDetailList
          items={data.items.map((item) => ({
            label: `${item.productNameSnapshot} (${item.skuSnapshot}) × ${formatKafilNumber(item.quantity)}`,
            value: formatMad(item.lineTotalMinor),
          }))}
        />
      </NSection>

      <NSection icon={Route} title="Status timeline">
        <NDetailList
          items={data.statusEvents.map((event) => ({
            label: `${event.fromStatus ? `${formatStatusLabel(event.fromStatus)} → ` : ""}${formatStatusLabel(event.toStatus)}`,
            value: `${formatKafilDate(event.createdAt)}${event.reason ? ` — ${event.reason}` : ""}`,
          }))}
        />
      </NSection>

      <NSection icon={CalendarDays} title="Record">
        <NDetailList
          items={[
            { label: "Last updated", value: formatKafilDate(data.updatedAt) },
            {
              label: "Household reference",
              value: data.familyProfileId.slice(0, 8),
            },
          ]}
        />
      </NSection>
    </div>
  );
}
