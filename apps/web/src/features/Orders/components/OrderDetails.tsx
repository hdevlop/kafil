"use client";

import {
  ClipboardCheck,
  MessageSquareText,
  Truck,
  UserRoundCog,
} from "lucide-react";
import {
  NBadge,
  NCard,
  NDetailList,
  NErrorState,
  NSheet,
  useNajmFormat,
} from "najm-kit";

import { OrderConfirmationStep } from "@/features/OrderCart/components/OrderCartDialog";
import { formatStatusLabel } from "@/features/StatusLabels";
import { useKafilLanguage } from "@/i18n/useKafilLanguage";
import { getPublicApiErrorMessage } from "@/services/apiError";

import { useOrder } from "../hooks/useOrders";
import { useFamilyOrder } from "../hooks/useFamilyOrdering";
import { useSponsorOrder } from "../hooks/useSponsorOrders";
import type { SharedOrderRecord } from "../sharedTypes";
import type { FamilyOrderDetail } from "../familyTypes";
import { DeliveryAssignmentCard, DeliveryPersonCard } from "./DeliveryDetailsSheet";

export function OrderDetailsSheet({ open, order, sponsor = false, onOpenChange }: Readonly<{
  open: boolean;
  order: SharedOrderRecord | null;
  sponsor?: boolean;
  onOpenChange: (open: boolean) => void;
}>) {
  const { language, t } = useKafilLanguage();

  return (
    <NSheet
      open={open}
      onOpenChange={onOpenChange}
      icon={ClipboardCheck}
      title={order ? `${t("common.view")} ${order.orderNumber}` : t("common.view")}
      description={sponsor ? t("dashboard.sponsor.privacySafeOrders") : t("operator.orders.snapshot")}
      width={480}
      side={language === "ar" ? "left" : "right"}
      classNames={{ content: "max-w-full bg-background", header: "bg-background", body: "bg-background" }}
    >
      {order ? (
        sponsor ? <SponsorOrderDetails orderId={order.id} /> : <OrderDetails orderId={order.id} />
      ) : null}
    </NSheet>
  );
}

function SponsorOrderDetails({ orderId }: Readonly<{ orderId: string }>) {
  const { language, t } = useKafilLanguage();
  const fmt = useNajmFormat();
  const order = useSponsorOrder(orderId);

  if (order.isPending) return <NCard title={t("common.loadingOrders")} loading />;
  if (order.isError) {
    return (
      <NErrorState
        message={getPublicApiErrorMessage(order.error, t("state.retry"))}
        title={t("common.orderNoOrdersTitle")}
        onRetry={() => void order.refetch()}
        surface="panel"
      />
    );
  }
  if (!order.data) return null;

  const data = order.data;
  return (
    <div className="space-y-4">
      <NCard title={data.orderNumber}>
        <NDetailList
          items={[
            { label: t("operator.orders.status"), value: <NBadge status={data.status} /> },
            { label: t("operator.orders.total"), value: fmt.money(data.actualTotalMinor ?? data.totalMinor) },
            { label: t("common.orderPlaced"), value: fmt.date(data.placedAt) },
            {
              label: t("operator.orders.delivery.column"),
              value: data.deliveryName ?? formatStatusLabel(data.deliveryStatus ?? "not_assigned", language),
            },
          ]}
        />
      </NCard>
      <NCard title={`${data.items.length} ${t("common.orderArticles")}`}>
        <div className="space-y-3">
          {data.items.map((item) => (
            <div className="flex items-start justify-between gap-4 border-t border-border pt-3 first:border-t-0 first:pt-0" key={`${item.sku}-${item.productName}`}>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{item.productName}</p>
                <p className="text-xs text-muted-foreground">{item.sku} · {item.quantity}</p>
              </div>
              <span className="shrink-0 text-sm font-medium">{fmt.money(item.lineTotalMinor)}</span>
            </div>
          ))}
        </div>
      </NCard>
    </div>
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
        <NErrorState
          message={getPublicApiErrorMessage(order.error, t("state.retry"))}
          title={t("common.orderNoOrdersTitle")}
          onRetry={() => void order.refetch()}
          surface="panel"
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
      familyStatus={<NBadge status={data.status} />}
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
  const { language, t } = useKafilLanguage();
  const order = useOrder(orderId);

  if (order.isPending) return <NCard title={t("operator.orders.workflow.loadingOrderDetails")} loading />;
  if (order.isError) {
    return (
      <NErrorState
        message={getPublicApiErrorMessage(order.error, t("state.retry"))}
        title={t("operator.orders.workflow.loadOrderError")}
        onRetry={() => void order.refetch()}
        surface="panel"
      />
    );
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
        familyStatus={<NBadge status={data.status} />}
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
              {formatStatusLabel(data.status, language)} reason
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
