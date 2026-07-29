"use client";

import { AlertTriangle } from "lucide-react";
import { FormInput, NButton, NForm, useDialog } from "najm-kit";

import { useDevFormTools } from "@/lib/devFormFill";
import {
  orderReasonFormSchema,
  toOrderReasonInput,
  type OrderReasonFormValues,
} from "../config/orderSchemas";
import { useOrderCommands } from "../hooks/useOrders";
import { useKafilLanguage } from "@/i18n/KafilLanguageProvider";
import type { OrderRecord } from "../types";

type ConfirmAction = "approve" | "startDelivery" | "deliver";
type ReasonAction = "reject" | "cancel";

export function ConfirmOrderCommandDialogContent({
  action,
  order,
}: Readonly<{ action: ConfirmAction; order: OrderRecord }>) {
  const { pop } = useDialog();
  const { t } = useKafilLanguage();
  const commands = useOrderCommands();
  const command = commands[action];
  const copy = {
    approve: { message: t("operator.orders.approveMessage"), button: t("action.approveOrder") },
    startDelivery: { message: "The purchase is recorded. Start the protected delivery timeline.", button: "Start delivery" },
    deliver: { message: t("operator.orders.deliverMessage"), button: t("action.markDelivered") },
  }[action];

  async function handleConfirm() {
    await command.mutateAsync(order.id);
    await pop();
  }

  return (
    <div className="space-y-5">
      <div className="flex gap-3 rounded-xl bg-amber-500/10 p-4 text-sm leading-6 text-muted-foreground">
        <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-600" />
        <p>{copy.message}</p>
      </div>
      <div className="flex justify-end pt-5">
        <NButton disabled={command.isPending} onClick={() => void handleConfirm()}>
          {command.isPending ? t("action.saving") : copy.button}
        </NButton>
      </div>
    </div>
  );
}

export function OrderReasonDialogContent({
  action,
  order,
}: Readonly<{ action: ReasonAction; order: OrderRecord }>) {
  const { pop } = useDialog();
  const commands = useOrderCommands();
  const command = commands[action];
  const isCancellation = action === "cancel";

  async function handleSubmit(values: OrderReasonFormValues) {
    await command.mutateAsync({
      ...toOrderReasonInput(order.id, values),
      confirmRecoverableGoods: ["purchased", "out_for_delivery"].includes(
        order.status,
      ),
    });
    await pop();
  }

  return (
    <NForm
      id={`${action}-order-form`}
      schema={orderReasonFormSchema}
      defaultValues={{ reason: "" }}
      onSubmit={handleSubmit}
      devTools={useDevFormTools(orderReasonFormSchema)}
      className="space-y-5"
    >
      <p className="text-sm leading-6 text-muted-foreground">
        {isCancellation
          ? ["purchased", "out_for_delivery"].includes(order.status)
            ? "This confirms the purchased goods/payment are recoverable and refunds the actual captured amount. Explain why the order cannot continue."
            : "Cancellation releases the pending budget reservation. Explain why this order cannot continue."
          : "Rejection releases this pending order's budget reservation. Explain why it cannot be fulfilled."}
      </p>
      <FormInput
        name="reason"
        type="textarea"
        formLabel="Reason"
        placeholder={isCancellation ? "Why must this order be cancelled?" : "Why must this order be rejected?"}
        icon="MessageSquareText"
        required
      />
      <div className="flex justify-end pt-5">
        <NButton type="submit" variant="destructive" disabled={command.isPending}>
          {command.isPending ? "Saving..." : isCancellation ? "Cancel order" : "Reject order"}
        </NButton>
      </div>
    </NForm>
  );
}

export function DeleteOrderDialogContent({
  order,
}: Readonly<{ order: OrderRecord }>) {
  const { pop } = useDialog();
  const { t } = useKafilLanguage();
  const { remove } = useOrderCommands();

  async function handleDelete() {
    try {
      await remove.mutateAsync(order.id);
      await pop();
    } catch {
      // useEntityCommand already presents the API error to the user.
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex gap-3 rounded-xl bg-destructive/10 p-4 text-sm leading-6 text-muted-foreground">
        <AlertTriangle
          aria-hidden
          className="mt-0.5 size-5 shrink-0 text-destructive"
        />
        <p>{t("operator.orders.deleteWarning")}</p>
      </div>
      <div className="flex justify-end pt-5">
        <NButton
          type="button"
          variant="destructive"
          disabled={remove.isPending}
          onClick={() => void handleDelete()}
        >
          {remove.isPending
            ? t("operator.orders.deleting")
            : t("operator.orders.deleteAction")}
        </NButton>
      </div>
    </div>
  );
}
