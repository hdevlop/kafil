"use client";

import {
  ClipboardCheck,
  MessageSquareText,
  Truck,
  UserRoundCog,
} from "lucide-react";
import { NCard, NSheet } from "najm-kit";

import { OrderConfirmationStep } from "@/features/OrderCart/components/OrderCartDialog";
import { useKafilLanguage } from "@/i18n/KafilLanguageProvider";
import { formatStatusLabel } from "@/lib/format";
import { PageErrorState } from "@/shared/PageState";
import { StatusBadge } from "@/shared/StatusBadge";

import { useOrder } from "../hooks/useOrders";
import { useFamilyOrder } from "../hooks/useFamilyOrdering";
import type { FamilyOrderDetail } from "../familyTypes";
import type { OrderRecord } from "../types";
import {
  DeliveryAssignmentCard,
  DeliveryPersonCard,
} from "./DeliveryDetailsSheet";

export function OrderDetailsSheet({ open, order, onOpenChange }: Readonly<{
  open: boolean;
  order: OrderRecord | null;
  onOpenChange: (open: boolean) => void;
}>) {
  const { language, t } = useKafilLanguage();

  return (
    <NSheet
      open={open}
      onOpenChange={onOpenChange}
      icon={ClipboardCheck}
      title={order ? `${t("common.view")} ${order.orderNumber}` : t("common.view")}
      description={t("operator.orders.snapshot")}
      width={480}
      side={language === "ar" ? "left" : "right"}
      classNames={{ content: "max-w-full bg-background", header: "bg-background", body: "bg-background" }}
    >
      {order ? <OrderDetails orderId={order.id} /> : null}
    </NSheet>
  );
}

export function FamilyOrderDetailsSheet({
  open,
  orderId,
  orderNumber,
  onOpenChange,
}: Readonly<{
  open: boolean;
  orderId: string;
  orderNumber: string | null;
  onOpenChange: (open: boolean) => void;
}>) {
  const { language, t } = useKafilLanguage();
  const order = useFamilyOrder(orderId);

  return (
    <NSheet
      open={open}
      onOpenChange={onOpenChange}
      icon={ClipboardCheck}
      title={orderNumber ? `${t("common.view")} ${orderNumber}` : t("common.view")}
      description={t("common.orderYourOrdersSubtitle")}
      width={480}
      side={language === "ar" ? "left" : "right"}
      classNames={{ content: "max-w-full bg-background", header: "bg-background", body: "bg-background" }}
    >
      {order.isPending ? <NCard title={t("common.loadingOrders")} loading /> : null}
      {order.isError ? (
        <PageErrorState
          error={order.error}
          title={t("common.orderNoOrdersTitle")}
          onRetry={() => void order.refetch()}
        />
      ) : null}
      {order.data ? <FamilyOrderDetails data={order.data} /> : null}
    </NSheet>
  );
}

function FamilyOrderDetails({ data }: Readonly<{ data: FamilyOrderDetail }>) {
  const { t } = useKafilLanguage();

  return (
    <OrderConfirmationStep
      family={{
        name: data.guardianLegalNameSnapshot,
        image: data.familyImage,
        exactAddress: data.deliveryAddressSnapshot,
        phone: data.deliveryPhoneSnapshot,
        availableMinor: null,
      }}
      familyMode
      familyStatus={<StatusBadge status={data.status} />}
      separateSections
      showNotice={false}
      totalMinor={data.requestedTotalMinor}
      items={data.items.map((item) => ({
        productId: item.productId,
        productName: item.productNameSnapshot,
        sku: item.skuSnapshot,
        quantity: item.quantity,
        estimatedUnitPriceMinor: item.unitPriceMinor,
        currency: data.currency,
        available: true,
      }))}
    >
      <section aria-labelledby="family-order-delivery-title" className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Truck aria-hidden className="size-4 text-primary" />
          <h3 id="family-order-delivery-title" className="text-sm font-semibold">
            {t("operator.orders.delivery.column")}
          </h3>
        </div>
        <DeliveryPersonCard
          delivery={data.delivery}
          emptyTitle={t("operator.orders.delivery.noActiveAssignment")}
          emptyDescription={t("operator.orders.delivery.assignToContinue")}
        />
      </section>
    </OrderConfirmationStep>
  );
}

export function OrderDetails({ orderId }: Readonly<{ orderId: string }>) {
  const { t } = useKafilLanguage();
  const order = useOrder(orderId);

  if (order.isPending) return <NCard title="Loading order details" loading />;
  if (order.isError) {
    return <PageErrorState error={order.error} title="We could not load this order" onRetry={() => void order.refetch()} />;
  }
  if (!order.data) return null;
  const data = order.data;
  const statusReason =
    data.status === "rejected"
      ? data.rejectionReason
      : data.status === "cancelled"
        ? data.cancellationReason
        : null;
  const hasDelivery = Boolean(
    data.currentDelivery || data.deliveryAttempts.length,
  );

  return (
    <OrderConfirmationStep
        family={{
          name: data.guardianLegalNameSnapshot,
          image: data.familyImage ?? null,
          exactAddress: data.deliveryAddressSnapshot,
          phone: data.deliveryPhoneSnapshot,
          availableMinor: null,
        }}
        familyMode={false}
        familyStatus={<StatusBadge status={data.status} />}
        separateSections
        showNotice={false}
        totalMinor={data.requestedTotalMinor}
        items={data.items.map((item) => ({
          productId: item.productId,
          productName: item.productNameSnapshot,
          sku: item.skuSnapshot,
          quantity: item.quantity,
          estimatedUnitPriceMinor: item.unitPriceMinor,
          currency: data.currency,
          available: true,
        }))}
      >
      {data.purchasingStaffNameSnapshot ? (
        <section
          aria-labelledby="order-purchasing-title"
          className="flex flex-col gap-2 border-b border-border pb-5"
        >
          <div className="flex items-center gap-2">
            <UserRoundCog aria-hidden className="size-4 text-primary" />
            <h3 id="order-purchasing-title" className="text-sm font-semibold">
              {t("family.orderCart.purchasingStaff")}
            </h3>
          </div>
          <NCard embedded>
            <p className="text-sm font-medium text-foreground">
              {data.purchasingStaffNameSnapshot}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("family.orderCart.purchasingAssignmentPlanned")}
            </p>
          </NCard>
        </section>
      ) : null}
      {hasDelivery ? (
        <section
          aria-labelledby="order-delivery-title"
          className={`flex flex-col gap-2 ${statusReason ? "border-b border-border pb-5" : ""}`}
        >
          <div className="flex items-center gap-2"><Truck aria-hidden className="size-4 text-primary" /><h3 id="order-delivery-title" className="text-sm font-semibold">Delivery</h3></div>
          <DeliveryAssignmentCard order={data} />
        </section>
      ) : null}
      {statusReason ? (
        <section
          aria-labelledby="order-status-reason-title"
          className="flex flex-col gap-2"
        >
          <div className="flex items-center gap-2">
            <MessageSquareText aria-hidden className="size-4 text-primary" />
            <h3 id="order-status-reason-title" className="text-sm font-semibold">
              {formatStatusLabel(data.status)} reason
            </h3>
          </div>
          <NCard>
            <p className="text-sm text-muted-foreground">{statusReason}</p>
          </NCard>
        </section>
      ) : null}
    </OrderConfirmationStep>
  );
}
