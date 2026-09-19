"use client";

import {
  CalendarDays,
  CheckCircle2,
  ExternalLink,
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
  useDialog,
} from "najm-kit";
import { useTranslation } from "najm-i18n/react";

import { DeliveryPurchaseDialogContent } from "@/features/Orders/components/OrderWorkflowForms";
import { OrderSummarySections } from "@/features/Orders/components/OrderSummarySections";
import { getPublicApiErrorMessage } from "@/services/apiError";

import type { DeliveryOrderDetail, DeliveryWorkflowState } from "../../types";
import { useDeliveryOrder } from "../hooks/useDeliveryOrder";
import type { useDeliveryDashboardCommands } from "../hooks/useDeliveryDashboard";

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
          <div className="flex w-full items-center gap-2">
            <div className="min-w-0 flex-1">
              <DeliverySheetFooter data={order.data} date={date} commands={commands} />
            </div>
            <DeliveryContactActions data={order.data} />
          </div>
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
        <DeliveryOrderBody data={order.data} />
      ) : null}
    </NSheet>
  );
}

function DeliveryOrderBody({
  data,
}: Readonly<{
  data: DeliveryOrderDetail;
}>) {
  const { t } = useTranslation();

  const scheduleDetails = (
    <div className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
      <div className="flex items-center gap-2">
        <CalendarDays aria-hidden className="size-4 shrink-0 text-primary" />
        <span className="text-muted-foreground">{t("dashboard.delivery.scheduleDate")}</span>
        <span className="font-medium">{data.attempt.scheduledDate ?? "—"}</span>
      </div>
    </div>
  );

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
      familyDetails={scheduleDetails}
      showProductsDivider={false}
    >
      {data.openIssues.length > 0 ? (
        <section className="flex flex-col gap-3">
          {/* A command refreshes the sheet in place, so open issues are
              announced rather than silently redrawn. */}
          <div className="mt-3 flex flex-wrap gap-2" role="status">
            {data.openIssues.map((issue) => (
              <NBadge key={issue.id} status="needs_attention">
                {t(issueLabelKey(issue.kind))}
              </NBadge>
            ))}
          </div>
        </section>
      ) : null}
    </OrderSummarySections>
  );
}

function DeliveryContactActions({ data }: Readonly<{ data: DeliveryOrderDetail }>) {
  const { t } = useTranslation();

  return (
    <div className="flex shrink-0 items-center gap-2">
      <NButton
        className="size-10 p-0"
        size="sm"
        variant="outline"
        aria-label={t("dashboard.delivery.callFamily")}
        disabled={!data.deliveryPhoneSnapshot}
        onClick={() => {
          if (data.deliveryPhoneSnapshot) {
            window.location.href = `tel:${data.deliveryPhoneSnapshot}`;
          }
        }}
      >
        <Phone className="size-4" />
      </NButton>
      <NButton
        className="size-10 p-0"
        size="sm"
        variant="outline"
        aria-label={t("dashboard.delivery.openMaps")}
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
      </NButton>
    </div>
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

function issueLabelKey(kind: DeliveryOrderDetail["openIssues"][number]["kind"]) {
  return (
    {
      address_confirmation: "dashboard.delivery.addressToConfirm",
      family_unreachable: "dashboard.delivery.familyUnreachable",
      missing_proof: "dashboard.delivery.missingProof",
    } as const
  )[kind];
}
