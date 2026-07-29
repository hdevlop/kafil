"use client";

import { useState } from "react";
import { z } from "zod";
import {
  DynamicArray,
  FormInput,
  NButton,
  NForm,
  NFormSectionHeader,
  useDialog,
} from "najm-kit";
import { ClipboardPlus, PackagePlus, Truck } from "lucide-react";

import { useFamilies } from "@/features/Families/hooks/useFamilies";
import { useProducts } from "@/features/Products/hooks/useProducts";
import { formatMad } from "@/lib/format";
import {
  deleteOrderEvidenceCandidate,
  uploadOrderEvidence,
} from "@/services/orderApi";

import { useOrderCommands } from "../hooks/useOrders";
import { useOrder } from "../hooks/useOrders";
import type { OrderDetail, OrderRecord } from "../types";

const assistedOrderSchema = z.object({
  familyProfileId: z.string().uuid(),
  assistanceChannel: z.enum(["phone", "in_person", "home_visit", "other"]),
  assistanceNote: z.string().trim().max(500).optional(),
  items: z
    .array(
      z.object({
        productId: z.string().uuid(),
        quantity: z.coerce.number().int().min(1).max(1_000),
      }),
    )
    .min(1)
    .max(100),
});

const purchaseSchema = z.object({
  merchantName: z.string().trim().min(2).max(200),
  receiptNumber: z.string().trim().max(120).optional(),
  purchasedAt: z.string().min(1),
  actualTotalMad: z
    .string()
    .trim()
    .regex(/^\d+(?:[.,]\d{1,2})?$/, "Enter a valid MAD amount"),
  reason: z.string().trim().max(500).optional(),
});

const deliverySchema = z.object({
  confirmationMethod: z.enum([
    "operator_confirmation",
    "recipient_signature",
    "photo",
  ]),
  deliveryNote: z.string().trim().max(500).optional(),
});

function AssistedOrderItemFields({
  productOptions,
}: Readonly<{
  productOptions: Array<{ value: string; label: string }>;
}>) {
  return (
    <div className="grid gap-4 md:grid-cols-[1fr_10rem]">
      <FormInput
        name="productId"
        type="combobox"
        formLabel="Product"
        searchPlaceholder="Search active products"
        emptyMessage="No active products found"
        items={productOptions}
        icon="PackageSearch"
        required
      />
      <FormInput
        name="quantity"
        type="number"
        formLabel="Quantity"
        icon="Hash"
        required
      />
    </div>
  );
}

export function CreateAssistedOrderDialogContent() {
  const { pop } = useDialog();
  const families = useFamilies({ limit: 100, offset: 0 });
  const products = useProducts({ limit: 100, offset: 0 });
  const { assisted } = useOrderCommands();
  const familyOptions =
    families.data
      ?.filter((family) => family.status === "active")
      .map((family) => ({
        value: family.id,
        label: `${family.guardianLegalName} — ${family.email}`,
      })) ?? [];
  const productOptions =
    products.data
      ?.filter((product) => product.status === "active")
      .map((product) => ({
        value: product.id,
        label: `${product.name} — ${formatMad(product.priceMinor)}`,
      })) ?? [];

  async function submit(values: z.infer<typeof assistedOrderSchema>) {
    await assisted.mutateAsync({
      ...values,
      assistanceNote: values.assistanceNote || undefined,
      idempotencyKey: crypto.randomUUID(),
    });
    await pop();
  }

  return (
    <NForm
      id="create-assisted-order"
      schema={assistedOrderSchema}
      defaultValues={{
        familyProfileId: "",
        assistanceChannel: "phone",
        assistanceNote: "",
        items: [{ productId: "", quantity: 1 }],
      }}
      onSubmit={submit}
      className="space-y-6"
    >
      <NFormSectionHeader icon={ClipboardPlus} title="Family request" />
      <div className="grid gap-4 md:grid-cols-2">
        <FormInput
          name="familyProfileId"
          type="combobox"
          formLabel="Family"
          searchPlaceholder="Search active families"
          emptyMessage="No active family found"
          items={familyOptions}
          icon="Users"
          disabled={families.isPending}
          required
        />
        <FormInput
          name="assistanceChannel"
          type="select"
          formLabel="Request channel"
          items={[
            { value: "phone", label: "Phone" },
            { value: "in_person", label: "In person" },
            { value: "home_visit", label: "Home visit" },
            { value: "other", label: "Other" },
          ]}
          icon="MessagesSquare"
          required
        />
      </div>
      <FormInput
        name="assistanceNote"
        type="textarea"
        formLabel="Private operational note"
        formDescription="Do not enter CIN, medical details, addresses, or document information."
        icon="NotebookPen"
      />
      <NFormSectionHeader icon={PackagePlus} title="Requested products" />
      <DynamicArray
        name="items"
        title="Product"
        addLabel="Add product"
        emptyLabel="Add at least one active product."
        onAdd={(append) => append({ productId: "", quantity: 1 })}
      >
        <AssistedOrderItemFields productOptions={productOptions} />
      </DynamicArray>
      <p className="rounded-xl bg-muted p-4 text-sm text-muted-foreground">
        Kafil recalculates current catalog prices and reserves the family budget.
        The order remains pending until a separate approval.
      </p>
      <div className="flex justify-end">
        <NButton
          type="submit"
          disabled={
            assisted.isPending || families.isPending || products.isPending
          }
        >
          {assisted.isPending ? "Creating..." : "Order"}
        </NButton>
      </div>
    </NForm>
  );
}

export function PurchaseOrderDialogContent({
  order,
  replace = false,
}: Readonly<{ order: OrderDetail; replace?: boolean }>) {
  const { pop } = useDialog();
  const commands = useOrderCommands();
  const command = replace ? commands.replacePurchase : commands.purchase;
  const [receipt, setReceipt] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  async function submit(values: z.infer<typeof purchaseSchema>) {
    if (!receipt) {
      setFileError("A protected receipt is required.");
      return;
    }
    const evidence = await uploadOrderEvidence("receipts", receipt);
    try {
      const actualTotalMinor = parseMadMinor(values.actualTotalMad);
      const common = {
        id: order.id,
        merchantName: values.merchantName,
        receiptNumber: values.receiptNumber || undefined,
        purchasedAt: new Date(values.purchasedAt).toISOString(),
        actualTotalMinor,
        receiptStoragePath: evidence.path,
        receiptMediaType: evidence.mediaType,
        receiptByteSize: evidence.byteSize,
        confirmHigherAmount: actualTotalMinor > order.totalMinor,
        idempotencyKey: crypto.randomUUID(),
      };
      if (replace) {
        await commands.replacePurchase.mutateAsync({
          ...common,
          reason: values.reason || "Correct purchase evidence",
        });
      } else {
        await commands.purchase.mutateAsync(common);
      }
      await pop();
    } catch (error) {
      await deleteOrderEvidenceCandidate(evidence.path).catch(() => undefined);
      throw error;
    }
  }

  return (
    <NForm
      id={replace ? "replace-order-purchase" : "record-order-purchase"}
      schema={purchaseSchema}
      defaultValues={{
        merchantName: order.activePurchase?.merchantName ?? "Marjane",
        receiptNumber: "",
        purchasedAt: new Date().toISOString().slice(0, 10),
        actualTotalMad: (
          (order.activePurchase?.actualTotalMinor ?? order.totalMinor) / 100
        ).toFixed(2),
        reason: "",
      }}
      onSubmit={submit}
      className="space-y-5"
    >
      <div className="grid gap-4 md:grid-cols-2">
        <FormInput name="merchantName" type="text" formLabel="Merchant" icon="Store" required />
        <FormInput name="purchasedAt" type="date" formLabel="Purchase date" icon="CalendarDays" required />
        <FormInput name="actualTotalMad" type="text" formLabel="Actual amount paid (MAD)" icon="ReceiptText" required />
        <FormInput name="receiptNumber" type="text" formLabel="Receipt number" icon="Hash" />
      </div>
      {replace ? (
        <FormInput
          name="reason"
          type="textarea"
          formLabel="Replacement reason"
          icon="MessageSquareText"
          required
        />
      ) : null}
      <label className="block space-y-2 text-sm">
        <span className="font-medium">Protected receipt</span>
        <input
          type="file"
          accept="application/pdf,image/jpeg,image/png,image/webp"
          onChange={(event) => {
            setReceipt(event.target.files?.[0] ?? null);
            setFileError(null);
          }}
        />
        <span className="block text-xs text-muted-foreground">
          PDF, JPEG, PNG, or WebP. Maximum 10 MB. Operator/admin access only.
        </span>
        {fileError ? <span className="block text-xs text-destructive">{fileError}</span> : null}
      </label>
      <p className="rounded-xl bg-muted p-4 text-sm text-muted-foreground">
        Requested: {formatMad(order.totalMinor)}. A higher actual amount is
        explicitly confirmed by this submission and still requires available
        family capacity.
      </p>
      <div className="flex justify-end">
        <NButton type="submit" disabled={command.isPending}>
          {command.isPending
            ? "Saving..."
            : replace
              ? "Replace purchase"
              : "Record purchase"}
        </NButton>
      </div>
    </NForm>
  );
}

export function PurchaseOrderDialogLoader({
  orderId,
  replace = false,
}: Readonly<{ orderId: string; replace?: boolean }>) {
  const order = useOrder(orderId);
  if (order.isPending) return <div className="py-8 text-center text-sm text-muted-foreground">Loading purchase details...</div>;
  if (order.isError || !order.data) {
    return (
      <div className="space-y-3 py-6 text-sm text-destructive">
        <p>Could not load the order purchase details.</p>
        <NButton variant="outline" onClick={() => void order.refetch()}>
          Try again
        </NButton>
      </div>
    );
  }
  return <PurchaseOrderDialogContent order={order.data} replace={replace} />;
}

export function ConfirmDeliveryDialogContent({
  order,
}: Readonly<{ order: OrderRecord }>) {
  const { pop } = useDialog();
  const { confirmDelivery } = useOrderCommands();
  const [proof, setProof] = useState<File | null>(null);

  async function submit(values: z.infer<typeof deliverySchema>) {
    let evidence:
      | Awaited<ReturnType<typeof uploadOrderEvidence>>
      | undefined;
    if (proof) evidence = await uploadOrderEvidence("deliveries", proof);
    try {
      await confirmDelivery.mutateAsync({
        id: order.id,
        ...values,
        deliveryNote: values.deliveryNote || undefined,
        ...(evidence
          ? {
              proofStoragePath: evidence.path,
              proofMediaType: evidence.mediaType,
              proofByteSize: evidence.byteSize,
            }
          : {}),
        idempotencyKey: crypto.randomUUID(),
      });
      await pop();
    } catch (error) {
      if (evidence) {
        await deleteOrderEvidenceCandidate(evidence.path).catch(() => undefined);
      }
      throw error;
    }
  }

  return (
    <NForm
      id="confirm-order-delivery"
      schema={deliverySchema}
      defaultValues={{
        confirmationMethod: "operator_confirmation",
        deliveryNote: "",
      }}
      onSubmit={submit}
      className="space-y-5"
    >
      <NFormSectionHeader icon={Truck} title="Delivery confirmation" />
      <FormInput
        name="confirmationMethod"
        type="select"
        formLabel="Confirmation method"
        items={[
          { value: "operator_confirmation", label: "Operator confirmation" },
          { value: "recipient_signature", label: "Recipient signature" },
          { value: "photo", label: "Photo proof" },
        ]}
        icon="BadgeCheck"
        required
      />
      <FormInput
        name="deliveryNote"
        type="textarea"
        formLabel="Private delivery note"
        formDescription="Do not enter names, CIN, phone numbers, medical details, or exact address."
        icon="NotebookPen"
      />
      <label className="block space-y-2 text-sm">
        <span className="font-medium">Protected proof (optional for operator confirmation)</span>
        <input
          type="file"
          accept="application/pdf,image/jpeg,image/png,image/webp"
          onChange={(event) => setProof(event.target.files?.[0] ?? null)}
        />
      </label>
      <div className="flex justify-end">
        <NButton type="submit" disabled={confirmDelivery.isPending}>
          {confirmDelivery.isPending ? "Saving..." : "Confirm delivery"}
        </NButton>
      </div>
    </NForm>
  );
}

function parseMadMinor(value: string) {
  const normalized = value.replace(",", ".");
  const amount = Math.round(Number(normalized) * 100);
  if (!Number.isSafeInteger(amount) || amount <= 0) {
    throw new Error("Enter a valid positive MAD amount.");
  }
  return amount;
}
