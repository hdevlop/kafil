"use client";

import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ExternalLink,
  Package,
  Phone,
  Play,
  ReceiptText,
  Truck,
} from "lucide-react";
import {
  NBadge,
  NButton,
  NCard,
  NErrorState,
  NSheet,
  NativeSelect,
  useDialog,
  useNajmFormat,
} from "najm-kit";
import { useTranslation } from "najm-i18n/react";
import { useState } from "react";

import { DeliveryPurchaseDialogContent } from "@/features/Orders/components/OrderWorkflowForms";
import { OrderSummarySections } from "@/features/Orders/components/OrderSummarySections";
import { getPublicApiErrorMessage } from "@/services/apiError";

import { minuteLabel } from "../../shared/deliveryTime";
import type { DeliveryOrderDetail, DeliveryWorkflowState } from "../../types";
import { useDeliveryOrder } from "../hooks/useDeliveryOrder";
import type { useDeliveryDashboardCommands } from "../hooks/useDeliveryDashboard";

type IssueKind = "address_confirmation" | "family_unreachable" | "missing_proof";

export function workflowLabelKey(state: DeliveryWorkflowState) {
  return (
    {
      waiting_approval: "dashboard.delivery.workflowWaitingApproval",
      purchase_required: "dashboard.delivery.workflowPurchaseRequired",
      ready_for_delivery: "dashboard.delivery.workflowReadyForDelivery",
      out_for_delivery: "dashboard.delivery.workflowOutForDelivery",
      delivered: "dashboard.delivery.workflowDelivered",
      needs_operator_action: "dashboard.delivery.workflowNeedsOperatorAction",
    } as const
  )[state];
}

/**
 * The single right-side sheet behind both a map marker and a planned-delivery
 * row. It owns the Delivery query and workflow action; its body is the shared
 * order summary, so the Family and Products presentation is never forked.
 * There is no Delivery-person card: the reader is the assignee.
 */
export function DeliveryOrderSheet({
  open,
  orderId,
  orderNumber,
  date,
  commands,
  onOpenChange,
}: Readonly<{
  open: boolean;
  orderId: string | null;
  orderNumber: string | null;
  date: string;
  commands: ReturnType<typeof useDeliveryDashboardCommands>;
  onOpenChange: (open: boolean) => void;
}>) {
  const { t } = useTranslation();
  const order = useDeliveryOrder(open ? orderId : null);

  return (
    <NSheet
      open={open}
      onOpenChange={onOpenChange}
      icon={Truck}
      title={orderNumber ? `${t("common.view")} ${orderNumber}` : t("common.view")}
      description={t("dashboard.delivery.orderSheetDescription")}
      width={480}
      // The sheet stays on the right in every locale by product decision; its
      // body still renders RTL content.
      side="right"
      classNames={{
        content: "max-w-full bg-background",
        header: "bg-background",
        body: "bg-background",
        footer: "bg-background",
      }}
      footer={
        order.data ? (
          <DeliverySheetFooter data={order.data} date={date} commands={commands} />
        ) : null
      }
    >
      {order.isPending ? (
        <NCard title={t("common.loadingOrders")} loading />
      ) : null}
      {order.isError ? (
        <NErrorState
          message={getPublicApiErrorMessage(order.error, t("state.retry"))}
          title={t("dashboard.delivery.loadOrderError")}
          onRetry={() => void order.refetch()}
          surface="panel"
        />
      ) : null}
      {order.data ? (
        <DeliveryOrderBody data={order.data} commands={commands} />
      ) : null}
    </NSheet>
  );
}

function DeliveryOrderBody({
  data,
  commands,
}: Readonly<{
  data: DeliveryOrderDetail;
  commands: ReturnType<typeof useDeliveryDashboardCommands>;
}>) {
  const { t } = useTranslation();
  const fmt = useNajmFormat();
  const [issueKind, setIssueKind] = useState<IssueKind>("address_confirmation");

  return (
    <OrderSummarySections
      order={{
        status: data.status,
        currency: data.currency,
        requestedTotalMinor: data.requestedTotalMinor,
        guardianLegalNameSnapshot: data.familyName,
        familyImage: data.familyImage,
        deliveryAddressSnapshot: data.deliveryAddressSnapshot,
        deliveryPhoneSnapshot: data.deliveryPhoneSnapshot,
        items: data.items,
      }}
    >
      <section aria-labelledby="delivery-order-schedule" className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <CalendarDays aria-hidden className="size-4 text-primary" />
          <h3 id="delivery-order-schedule" className="text-sm font-semibold">
            {t("dashboard.delivery.orderSchedule")}
          </h3>
        </div>
        <NCard embedded>
          <div className="grid gap-2 text-sm">
            <span>
              <CalendarDays aria-hidden className="me-2 inline size-4" />
              {data.attempt.scheduledDate ?? "—"} ·{" "}
              {minuteLabel(data.attempt.windowStartMinute)}–
              {minuteLabel(data.attempt.windowEndMinute)}
            </span>
            <span>
              <Package aria-hidden className="me-2 inline size-4" />
              {fmt.number(data.attempt.packageCount ?? 0)}{" "}
              {t("dashboard.delivery.packages")}
            </span>
          </div>
          {/* A command refreshes the sheet in place, so the new workflow state
              and any open issue are announced rather than silently redrawn. */}
          <div className="mt-3 flex flex-wrap gap-2" role="status">
            <NBadge status={data.workflowState}>
              {t(workflowLabelKey(data.workflowState))}
            </NBadge>
            {data.openIssues.map((issue) => (
              <NBadge key={issue.id} status="needs_attention">
                {t(issueLabelKey(issue.kind))}
              </NBadge>
            ))}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <NButton
              size="sm"
              variant="outline"
              disabled={!data.deliveryPhoneSnapshot}
              onClick={() => {
                if (data.deliveryPhoneSnapshot) {
                  window.location.href = `tel:${data.deliveryPhoneSnapshot}`;
                }
              }}
            >
              <Phone className="size-4" />
              {t("dashboard.delivery.callFamily")}
            </NButton>
            <NButton
              size="sm"
              variant="outline"
              onClick={() => {
                const query = data.coordinates
                  ? `${data.coordinates.latitude},${data.coordinates.longitude}`
                  : data.deliveryAddressSnapshot;
                window.open(
                  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`,
                  "_blank",
                  "noopener,noreferrer",
                );
              }}
            >
              <ExternalLink className="size-4" />
              {t("dashboard.delivery.openMaps")}
            </NButton>
          </div>
          {data.canReportIssue ? (
            <div className="mt-3 flex gap-2">
              <NativeSelect
                className="min-w-0 flex-1"
                value={issueKind}
                aria-label={t("dashboard.delivery.issueKind")}
                options={[
                  { value: "address_confirmation", label: t("dashboard.delivery.addressToConfirm") },
                  { value: "family_unreachable", label: t("dashboard.delivery.familyUnreachable") },
                  { value: "missing_proof", label: t("dashboard.delivery.missingProof") },
                ]}
                onChange={(event) => setIssueKind(event.target.value as IssueKind)}
              />
              <NButton
                size="sm"
                variant="outline"
                disabled={commands.reportIssue.isPending}
                onClick={() =>
                  void commands.reportIssue.mutateAsync({
                    id: data.id,
                    attemptId: data.attempt.id,
                    kind: issueKind,
                    idempotencyKey: crypto.randomUUID(),
                  })
                }
              >
                <AlertTriangle className="size-4" />
                <span className="sr-only">{t("dashboard.delivery.reportIssue")}</span>
              </NButton>
            </div>
          ) : null}
        </NCard>
      </section>
    </OrderSummarySections>
  );
}

/**
 * One sticky primary action, chosen from the server-derived workflow state.
 * After every mutation the shared command hook invalidates and awaits the
 * refetch, so the next action comes from fresh data rather than local state.
 */
function DeliverySheetFooter({
  data,
  date,
  commands,
}: Readonly<{
  data: DeliveryOrderDetail;
  date: string;
  commands: ReturnType<typeof useDeliveryDashboardCommands>;
}>) {
  const { t } = useTranslation();
  const dialog = useDialog();

  if (data.canPurchase) {
    return (
      <NButton
        className="w-full"
        onClick={() =>
          void dialog.openDialog({
            title: t("dashboard.delivery.validatePurchase"),
            description: t("common.recordPurchaseDescription"),
            children: (
              <DeliveryPurchaseDialogContent
                order={{ id: data.id, requestedTotalMinor: data.requestedTotalMinor }}
                date={date}
              />
            ),
            showButtons: false,
            size: "lg",
            height: "auto",
          })
        }
      >
        <ReceiptText className="size-4" />
        {t("dashboard.delivery.validatePurchase")}
      </NButton>
    );
  }

  if (data.canStart) {
    return (
      <NButton
        className="w-full"
        disabled={commands.start.isPending}
        onClick={() =>
          void commands.start.mutateAsync({
            id: data.id,
            idempotencyKey: crypto.randomUUID(),
          })
        }
      >
        <Play className="size-4" />
        {t("dashboard.delivery.startDelivery")}
      </NButton>
    );
  }

  if (data.canConfirm) {
    return (
      <NButton
        className="w-full"
        disabled={commands.confirm.isPending}
        onClick={() =>
          void commands.confirm.mutateAsync({
            id: data.id,
            confirmationMethod: "operator_confirmation",
            idempotencyKey: crypto.randomUUID(),
          })
        }
      >
        <CheckCircle2 className="size-4" />
        {t("dashboard.delivery.confirmDelivery")}
      </NButton>
    );
  }

  return (
    <p className="w-full text-center text-sm text-muted-foreground" role="status">
      {data.workflowState === "delivered"
        ? t("dashboard.delivery.workflowDelivered")
        : data.workflowState === "waiting_approval"
          ? t("dashboard.delivery.workflowWaitingApproval")
          : t("dashboard.delivery.noAvailableAction")}
    </p>
  );
}

function issueLabelKey(kind: IssueKind) {
  return (
    {
      address_confirmation: "dashboard.delivery.addressToConfirm",
      family_unreachable: "dashboard.delivery.familyUnreachable",
      missing_proof: "dashboard.delivery.missingProof",
    } as const
  )[kind];
}
