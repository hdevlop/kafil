import { z } from "zod";

const id = z.string().uuid();
const quantity = z.coerce.number().int().min(1).max(1_000);
const status = z.enum([
  "pending",
  "approved",
  "in_preparation",
  "purchased",
  "out_for_delivery",
  "delivered",
  "rejected",
  "cancelled",
]);
const reason = z.string().trim().min(3).max(500);
const idempotencyKey = z.string().trim().min(8).max(160);
const evidencePath = z
  .string()
  .trim()
  .regex(
    /^\/api\/order-evidence\/(?:receipts|deliveries)\/serve\/[0-9a-f-]{36}\.(?:pdf|jpg|jpeg|png|webp)$/i,
  );
const evidenceMediaType = z.enum([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);
const evidenceByteSize = z.coerce.number().int().min(1).max(10_000_000);

export const orderIdParams = z.object({ id });
export const cartProductIdParams = z.object({ productId: id });

export const cartItemDto = z.object({
  productId: id,
  quantity,
});

export const setCartItemQuantityDto = z.object({ quantity });

export const submitOrderDto = z.object({
  idempotencyKey,
});

export const orderReasonDto = z.object({ reason });

export const assignDeliveryDto = z.object({
  staffProfileId: id,
  idempotencyKey,
});

export const reassignDeliveryDto = assignDeliveryDto.extend({ reason });

export const startDeliveryDto = z.object({ idempotencyKey });

export const failDeliveryDto = z.object({ reason, idempotencyKey });

export const assistedOrderDto = z.object({
  familyProfileId: id,
  purchasingStaffProfileId: id.optional(),
  deliveryStaffProfileId: id.optional(),
  items: z
    .array(
      z.object({
        productId: id,
        quantity,
      }),
    )
    .min(1)
    .max(100)
    .superRefine((items, context) => {
      const seen = new Set<string>();
      items.forEach((item, index) => {
        if (seen.has(item.productId)) {
          context.addIssue({
            code: "custom",
            message: "Product IDs must be unique",
            path: [index, "productId"],
          });
        }
        seen.add(item.productId);
      });
    }),
  assistanceChannel: z.enum(["phone", "in_person", "home_visit", "other"]),
  assistanceNote: z.string().trim().max(500).nullish(),
  idempotencyKey,
});

export const recordPurchaseDto = z.object({
  merchantName: z.string().trim().min(2).max(200),
  receiptNumber: z.string().trim().max(120).nullish(),
  purchasedAt: z.coerce.date(),
  actualTotalMinor: z.coerce
    .number()
    .int()
    .min(1)
    .max(Number.MAX_SAFE_INTEGER),
  receiptStoragePath: evidencePath.refine(
    (path) => path.includes("/receipts/"),
    "Receipt evidence path is required",
  ),
  receiptMediaType: evidenceMediaType,
  receiptByteSize: evidenceByteSize,
  confirmHigherAmount: z.boolean().optional().default(false),
  idempotencyKey,
});

export const replacePurchaseDto = recordPurchaseDto.extend({
  reason,
});

export const confirmDeliveryDto = z
  .object({
    confirmationMethod: z.enum([
      "operator_confirmation",
      "recipient_signature",
      "photo",
    ]),
    deliveryNote: z.string().trim().max(500).nullish(),
    proofStoragePath: evidencePath
      .refine(
        (path) => path.includes("/deliveries/"),
        "Delivery evidence path is required",
      )
      .optional(),
    proofMediaType: evidenceMediaType.optional(),
    proofByteSize: evidenceByteSize.optional(),
    idempotencyKey,
  })
  .superRefine((input, context) => {
    const proofFields = [
      input.proofStoragePath,
      input.proofMediaType,
      input.proofByteSize,
    ];
    const hasAnyProof = proofFields.some((value) => value !== undefined);
    const hasCompleteProof = proofFields.every((value) => value !== undefined);
    if (hasAnyProof && !hasCompleteProof) {
      context.addIssue({
        code: "custom",
        message: "Delivery proof metadata must be complete",
        path: ["proofStoragePath"],
      });
    }
    if (
      input.confirmationMethod !== "operator_confirmation" &&
      !hasCompleteProof
    ) {
      context.addIssue({
        code: "custom",
        message: "This confirmation method requires delivery proof",
        path: ["proofStoragePath"],
      });
    }
  });

export const operatorCancelOrderDto = z.object({
  reason,
  confirmRecoverableGoods: z.boolean().optional().default(false),
});

export const familyCancelOrderDto = z.object({
  reason: reason.optional(),
});

export const orderListQuery = z.object({
  search: z.string().trim().min(1).max(100).optional(),
  familyProfileId: id.optional(),
  status: status.optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export const ownOrderListQuery = z.object({
  search: z.string().trim().min(1).max(100).optional(),
  status: status.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export type CartItemDto = z.input<typeof cartItemDto>;
export type SetCartItemQuantityDto = z.input<typeof setCartItemQuantityDto>;
export type SubmitOrderDto = z.input<typeof submitOrderDto>;
export type AssistedOrderDto = z.input<typeof assistedOrderDto>;
export type RecordPurchaseDto = z.input<typeof recordPurchaseDto>;
export type ReplacePurchaseDto = z.input<typeof replacePurchaseDto>;
export type ConfirmDeliveryDto = z.input<typeof confirmDeliveryDto>;
export type OperatorCancelOrderDto = z.input<typeof operatorCancelOrderDto>;
export type OrderReasonDto = z.input<typeof orderReasonDto>;
export type AssignDeliveryDto = z.input<typeof assignDeliveryDto>;
export type ReassignDeliveryDto = z.input<typeof reassignDeliveryDto>;
export type StartDeliveryDto = z.input<typeof startDeliveryDto>;
export type FailDeliveryDto = z.input<typeof failDeliveryDto>;
export type FamilyCancelOrderDto = z.input<typeof familyCancelOrderDto>;
export type OrderListQuery = z.input<typeof orderListQuery>;
export type OwnOrderListQuery = z.input<typeof ownOrderListQuery>;
