"use client";

import { AlertTriangle } from "lucide-react";
import { FormInput, NButton, NForm, useDialog } from "najm-kit";

import { devFormTools } from "@/lib/devFormFill";
import {
  orderReasonFormSchema,
  toOrderReasonInput,
  type OrderReasonFormValues,
} from "../config/orderSchemas";
import { useOrderCommands } from "../hooks/useOrders";
import { useKafilLanguage } from "@/i18n/KafilLanguageProvider";
import type { OrderRecord } from "../types";

type ConfirmAction = "approve" | "preparation" | "deliver";
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
    preparation: { message: t("operator.orders.preparationMessage"), button: t("action.startPreparation") },
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
    await command.mutateAsync(toOrderReasonInput(order.id, values));
    await pop();
  }

  return (
    <NForm
      id={`${action}-order-form`}
      schema={orderReasonFormSchema}
      defaultValues={{ reason: "" }}
      onSubmit={handleSubmit}
      devTools={devFormTools(orderReasonFormSchema)}
      className="space-y-5"
    >
      <p className="text-sm leading-6 text-muted-foreground">
        {isCancellation
          ? "Cancellation releases pending reservations or reverses the captured budget and allocated stock. Explain why this order cannot continue."
          : "Rejection releases this pending order's budget and inventory reservations. Explain why it cannot be fulfilled."}
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
