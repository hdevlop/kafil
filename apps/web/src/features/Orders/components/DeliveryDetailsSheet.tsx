"use client";

import {
  CheckCircle2,
  Circle,
  Clock3,
  History,
  Truck,
} from "lucide-react";
import { NButton, NCard, NSheet, useNajmFormat } from "najm-kit";
import { getPersonImage } from "najm-kit/person-images";

import { formatStatusLabel } from "@/features/StatusLabels";
import { useKafilLanguage } from "@/i18n/useKafilLanguage";
import type { KafilLanguage } from "@/preferences";
import { ManagedAvatar } from "@/shared/ManagedAvatar";
import { PageErrorState } from "@/shared/PageState";
import { StatusBadge } from "@/shared/StatusBadge";

import { getOrderActions, type OrderCommand } from "../config/orderActions";
import { useOrder } from "../hooks/useOrders";
import type { DeliveryAttempt, OrderRecord } from "../types";

interface DeliveryDetailsSheetProps {
  open: boolean;
  order: OrderRecord | null;
  onOpenChange: (open: boolean) => void;
  onAction: (command: OrderCommand, order: OrderRecord) => void;
}

export function DeliveryDetailsSheet({
  open,
  order,
  onOpenChange,
  onAction,
}: Readonly<DeliveryDetailsSheetProps>) {
  const { language, t } = useKafilLanguage();
  const detail = useOrder(open ? order?.id ?? "" : "");
  const deliveryActions = order
    ? getOrderActions(order).filter((action) =>
        [
          "assignDelivery",
          "reassignDelivery",
          "startDelivery",
          "failDelivery",
          "confirmDelivery",
        ].includes(action.command),
      )
    : [];

  return (
    <NSheet
      open={open}
      onOpenChange={onOpenChange}
      icon={Truck}
      title={order ? `${t("operator.orders.delivery.column")} · ${order.orderNumber}` : t("operator.orders.delivery.details")}
      description={t("operator.orders.delivery.detailsDescription")}
      width={440}
      side={language === "ar" ? "left" : "right"}
      classNames={{
        content: "max-w-full bg-background",
        header: "bg-background",
        body: "space-y-5 bg-background",
        footer: "bg-background",
      }}
      footer={
        order && deliveryActions.length ? (
          <div className="flex flex-wrap justify-end gap-2">
            {deliveryActions.map((action) => (
              <NButton
                key={action.command}
                variant={action.danger ? "destructive" : "outline"}
                onClick={() => onAction(action.command, order)}
              >
                {deliveryActionLabel(action.command, language, t)}
              </NButton>
            ))}
          </div>
        ) : null
      }
    >
      {detail.isPending ? (
        <NCard title={t("operator.orders.delivery.loading")} loading />
      ) : detail.isError ? (
        <PageErrorState
          error={detail.error}
          title="We could not load delivery details"
          onRetry={() => void detail.refetch()}
        />
      ) : detail.data ? (
        <DeliveryDetailsBody order={detail.data} />
      ) : null}
    </NSheet>
  );
}

export function DeliveryAssignmentCard({
  order,
}: Readonly<{ order: NonNullable<ReturnType<typeof useOrder>["data"]> }>) {
  const { t } = useKafilLanguage();
  const featured = getFeaturedDeliveryAttempt(order);

  return (
    <DeliveryPersonCard
      delivery={featured}
      emptyTitle={t("operator.orders.delivery.noActiveAssignment")}
      emptyDescription={
        order.latestDelivery?.status === "failed"
          ? t("operator.orders.delivery.needsReassignment")
          : t("operator.orders.delivery.assignToContinue")
      }
    />
  );
}

export interface DeliveryPersonCardData {
  deliveryNameSnapshot: string;
  deliveryPhoneSnapshot: string;
  image: string | null;
  gender: "M" | "F" | null;
  assignedAt: string | Date;
  status: string;
}

export function DeliveryPersonCard({
  delivery,
  emptyTitle,
  emptyDescription,
}: Readonly<{
  delivery: DeliveryPersonCardData | null;
  emptyTitle: string;
  emptyDescription: string;
}>) {
  const fmt = useNajmFormat();

  return (
    <NCard
      title={delivery ? undefined : emptyTitle}
      description={delivery ? undefined : emptyDescription}
    >
      {delivery ? (
        <div className="flex items-center justify-between gap-3">
        <ManagedAvatar
          className="min-w-0"
          fallback={delivery.deliveryNameSnapshot}
          meta={<span className="flex items-center gap-1.5"><Clock3 aria-hidden className="size-3.5" />{fmt.dateTime(delivery.assignedAt)}</span>}
            shape="rounded"
            size="lg"
            src={getPersonImage({ image: delivery.image, role: "adult", gender: delivery.gender })}
            subtitle={delivery.deliveryPhoneSnapshot}
            title={delivery.deliveryNameSnapshot}
          />
          <StatusBadge className="shrink-0" status={delivery.status} />
        </div>
      ) : null}
    </NCard>
  );
}

function getFeaturedDeliveryAttempt(
  order: NonNullable<ReturnType<typeof useOrder>["data"]>,
) {
  if (order.currentDelivery) return order.currentDelivery;

  const latestAttemptId = order.latestDelivery?.attemptId;
  if (order.status === "cancelled" || order.status === "rejected") {
    return (
      order.deliveryAttempts.find((attempt) => attempt.id === latestAttemptId) ??
      [...order.deliveryAttempts].reverse()[0] ??
      null
    );
  }
  if (order.status !== "delivered") return null;

  return (
    order.deliveryAttempts.find(
      (attempt) =>
        attempt.id === latestAttemptId && attempt.status === "delivered",
    ) ??
    [...order.deliveryAttempts]
      .reverse()
      .find((attempt) => attempt.status === "delivered") ??
    null
  );
}

function DeliveryDetailsBody({
  order,
}: Readonly<{ order: NonNullable<ReturnType<typeof useOrder>["data"]> }>) {
  const { t } = useKafilLanguage();
  const fmt = useNajmFormat();
  const featured = getFeaturedDeliveryAttempt(order);
  const history = order.deliveryAttempts.filter((attempt) => attempt.id !== featured?.id);
  const milestones = [
    { label: t("operator.orders.delivery.orderConfirmed"), at: order.approvedAt, complete: Boolean(order.approvedAt) },
    { label: t("operator.orders.delivery.purchaseRecorded"), at: order.activePurchase?.purchasedAt, complete: Boolean(order.activePurchase) },
    { label: t("operator.orders.delivery.assigned"), at: featured?.assignedAt ?? order.latestDelivery?.assignedAt, complete: order.deliveryAttempts.length > 0 },
    { label: t("operator.orders.delivery.outForDelivery"), at: order.deliveryStartedAt, complete: Boolean(order.deliveryStartedAt) },
    { label: t("operator.orders.delivery.delivered"), at: order.deliveredAt, complete: order.status === "delivered" },
  ];

  return (
    <div className="space-y-5">
      <DeliveryAssignmentCard order={order} />

      <section aria-labelledby="delivery-progress-title" className="space-y-3">
        <h3 id="delivery-progress-title" className="font-semibold">
          {t("operator.orders.delivery.progress")}
        </h3>
        <ol className="space-y-3" aria-label="Delivery progress timeline">
          {milestones.map((milestone) => (
            <li key={milestone.label} className="flex items-start gap-3">
              {milestone.complete ? (
                <CheckCircle2 aria-hidden className="mt-0.5 size-5 shrink-0 text-emerald-600" />
              ) : (
                <Circle aria-hidden className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
              )}
              <div>
                <p className="text-sm font-medium">{milestone.label}</p>
                <p className="text-xs text-muted-foreground">
                  {milestone.at ? fmt.date(milestone.at) : t("operator.orders.delivery.pending")}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {history.length ? (
        <section aria-labelledby="delivery-history-title" className="space-y-3">
          <div className="flex items-center gap-2">
            <History aria-hidden className="size-4" />
            <h3 id="delivery-history-title" className="font-semibold">
              {t("operator.orders.delivery.history")}
            </h3>
          </div>
          <ol className="space-y-3">
            {[...history].reverse().map((attempt) => (
              <li key={attempt.id}>
                <DeliveryAttemptCard attempt={attempt} />
              </li>
            ))}
          </ol>
        </section>
      ) : null}
    </div>
  );
}

function DeliveryAttemptCard({ attempt }: Readonly<{ attempt: DeliveryAttempt }>) {
  const fmt = useNajmFormat();
  const endedAt =
    attempt.completedAt ?? attempt.failedAt ?? attempt.cancelledAt ?? attempt.startedAt ?? attempt.assignedAt;

  return (
    <NCard>
      <div className="flex items-center justify-between gap-3">
        <ManagedAvatar
          className="min-w-0"
          fallback={attempt.deliveryNameSnapshot}
          meta={fmt.dateTime(endedAt)}
          shape="rounded"
          size="md"
          src={getPersonImage({ image: attempt.image, role: "adult", gender: attempt.gender })}
          subtitle={attempt.deliveryPhoneSnapshot}
          title={attempt.deliveryNameSnapshot}
        />
        <StatusBadge className="shrink-0" status={attempt.status} />
      </div>
    </NCard>
  );
}

function deliveryActionLabel(
  command: OrderCommand,
  language: KafilLanguage,
  t: ReturnType<typeof useKafilLanguage>["t"],
) {
  switch (command) {
    case "assignDelivery":
      return t("operator.orders.delivery.assign");
    case "reassignDelivery":
      return t("operator.orders.delivery.changeStaff");
    case "startDelivery":
      return t("operator.orders.delivery.start");
    case "failDelivery":
      return t("operator.orders.delivery.failed");
    case "confirmDelivery":
      return t("operator.orders.delivery.confirm");
    default:
      return formatStatusLabel(command, language);
  }
}
