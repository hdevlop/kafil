"use client";

import { Boxes, SlidersHorizontal } from "lucide-react";
import { FormInput, NButton, NForm, NFormSectionHeader, useDialog } from "najm-kit";

import { devFormTools } from "@/lib/devFormFill";

import {
  inventoryAdjustmentFormSchema,
  inventoryRestockFormSchema,
  toInventoryAdjustmentInput,
  toInventoryRestockInput,
  type InventoryAdjustmentFormValues,
  type InventoryRestockFormValues,
} from "../config/inventorySchemas";
import { useInventoryCommands } from "../hooks/useInventory";

export function InventoryRestockDialogContent({
  productId,
}: Readonly<{ productId: string }>) {
  const { pop } = useDialog();
  const { restock } = useInventoryCommands();

  async function handleSubmit(values: InventoryRestockFormValues) {
    await restock.mutateAsync({
      productId,
      input: toInventoryRestockInput(values, crypto.randomUUID()),
    });
    await pop();
  }

  return (
    <NForm
      id="inventory-restock-form"
      schema={inventoryRestockFormSchema}
      defaultValues={{ reason: "" }}
      onSubmit={handleSubmit}
      devTools={devFormTools(inventoryRestockFormSchema)}
      className="space-y-5"
    >
      <NFormSectionHeader icon={Boxes} title="Stock receipt" />
      <FormInput name="quantity" type="number" formLabel="Quantity received" placeholder="For example: 25" icon="PackagePlus" required />
      <FormInput name="reason" type="textarea" formLabel="Reason" placeholder="Why is this stock being received?" icon="MessageSquareText" required />
      <div className="flex justify-end pt-5">
        <NButton type="submit" disabled={restock.isPending}>
          {restock.isPending ? "Recording..." : "Record stock receipt"}
        </NButton>
      </div>
    </NForm>
  );
}

export function InventoryAdjustmentDialogContent({
  productId,
}: Readonly<{ productId: string }>) {
  const { pop } = useDialog();
  const { adjust } = useInventoryCommands();

  async function handleSubmit(values: InventoryAdjustmentFormValues) {
    await adjust.mutateAsync({
      productId,
      input: toInventoryAdjustmentInput(values, crypto.randomUUID()),
    });
    await pop();
  }

  return (
    <NForm
      id="inventory-adjustment-form"
      schema={inventoryAdjustmentFormSchema}
      defaultValues={{ reason: "" }}
      onSubmit={handleSubmit}
      devTools={devFormTools(inventoryAdjustmentFormSchema)}
      className="space-y-5"
    >
      <NFormSectionHeader icon={SlidersHorizontal} title="Manual stock adjustment" />
      <FormInput name="quantity" type="number" formLabel="Adjustment quantity" placeholder="For example: 5 or -2" icon="SlidersHorizontal" required />
      <FormInput name="reason" type="textarea" formLabel="Reason" placeholder="Why is this adjustment needed?" icon="MessageSquareText" required />
      <div className="flex justify-end pt-5">
        <NButton type="submit" variant="destructive" disabled={adjust.isPending}>
          {adjust.isPending ? "Recording..." : "Record adjustment"}
        </NButton>
      </div>
    </NForm>
  );
}
