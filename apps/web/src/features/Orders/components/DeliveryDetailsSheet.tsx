"use client";

import {
  CheckCircle2,
  Circle,
  Clock3,
  History,
  Phone,
  Truck,
  UserRound,
} from "lucide-react";
import { NButton, NCard, NCardInfo, NCardSection, NSheet } from "najm-kit";

import { useKafilLanguage } from "@/i18n/KafilLanguageProvider";
import { formatKafilDate, formatStatusLabel } from "@/lib/format";
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
      width={560}
      side={language === "ar" ? "left" : "right"}
      classNames={{ content: "max-w-full", body: "space-y-5" }}
      footer={
        order && deliveryActions.length ? (
          <div className="flex flex-wrap justify-end gap-2">
            {deliveryActions.map((action) => (
              <NButton
                key={action.command}
                variant={action.danger ? "destructive" : "outline"}
                onClick={() => onAction(action.command, order)}
              >
                {deliveryActionLabel(action.command, t)}
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

function DeliveryDetailsBody({
  order,
}: Readonly<{ order: NonNullable<ReturnType<typeof useOrder>["data"]> }>) {
  const { t } = useKafilLanguage();
  const current = order.currentDelivery;
  const milestones = [
    { label: t("operator.orders.delivery.orderConfirmed"), at: order.approvedAt, complete: Boolean(order.approvedAt) },
    { label: t("operator.orders.delivery.purchaseRecorded"), at: order.activePurchase?.purchasedAt, complete: Boolean(order.activePurchase) },
    { label: t("operator.orders.delivery.assigned"), at: current?.assignedAt, complete: order.deliveryAttempts.length > 0 },
    { label: t("operator.orders.delivery.outForDelivery"), at: order.deliveryStartedAt, complete: Boolean(order.deliveryStartedAt) },
    { label: t("operator.orders.delivery.delivered"), at: order.deliveredAt, complete: order.status === "delivered" },
  ];

  return (
    <div className="space-y-5">
      <NCard
        embedded
        title={current?.deliveryNameSnapshot ?? t("operator.orders.delivery.noActiveAssignment")}
        description={
          current
            ? `${formatStatusLabel(current.status)} · assigned ${formatKafilDate(current.assignedAt)}`
            : order.latestDelivery?.status === "failed"
              ? t("operator.orders.delivery.needsReassignment")
              : t("operator.orders.delivery.assignToContinue")
        }
      >
        {current ? (
          <NCardSection>
            <NCardInfo icon={Phone} label={t("operator.orders.delivery.operationalPhone")} value={current.deliveryPhoneSnapshot} />
            <NCardInfo
              icon={UserRound}
              label={t("operator.orders.delivery.affiliation")}
              value={
                current.companyNameSnapshot ||
                formatStatusLabel(current.affiliationSnapshot)
              }
            />
          </NCardSection>
        ) : null}
      </NCard>

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
                  {milestone.at ? formatKafilDate(milestone.at) : t("operator.orders.delivery.pending")}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="delivery-history-title" className="space-y-3">
        <div className="flex items-center gap-2">
          <History aria-hidden className="size-4" />
          <h3 id="delivery-history-title" className="font-semibold">
            {t("operator.orders.delivery.history")}
          </h3>
        </div>
        {order.deliveryAttempts.length ? (
          <ol className="space-y-3" aria-label="Immutable delivery attempt history">
            {[...order.deliveryAttempts].reverse().map((attempt) => (
              <DeliveryAttemptCard key={attempt.id} attempt={attempt} />
            ))}
          </ol>
        ) : (
          <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
            {t("operator.orders.delivery.noAttempts")}
          </p>
        )}
      </section>
    </div>
  );
}

function DeliveryAttemptCard({ attempt }: Readonly<{ attempt: DeliveryAttempt }>) {
  const { t } = useKafilLanguage();
  const endedAt =
    attempt.completedAt ?? attempt.failedAt ?? attempt.cancelledAt ?? attempt.startedAt;
  return (
    <li className="rounded-xl border p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium">{attempt.deliveryNameSnapshot}</p>
          <p className="text-xs text-muted-foreground">
            Assigned {formatKafilDate(attempt.assignedAt)}
          </p>
        </div>
        <StatusBadge status={attempt.status} />
      </div>
      <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
        <Clock3 aria-hidden className="size-3.5" />
        <span>{endedAt ? formatKafilDate(endedAt) : t("operator.orders.delivery.awaitingStart")}</span>
      </div>
      {attempt.failureReason || attempt.cancellationReason ? (
        <p className="mt-3 rounded-lg bg-muted p-3 text-sm">
          {attempt.failureReason ?? attempt.cancellationReason}
        </p>
      ) : null}
    </li>
  );
}

function deliveryActionLabel(
  command: OrderCommand,
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
      return formatStatusLabel(command);
  }
}
