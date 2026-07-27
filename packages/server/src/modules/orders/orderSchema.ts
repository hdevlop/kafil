import { sql } from "drizzle-orm";
import {
  bigint,
  type AnyPgColumn,
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { usersTable } from "najm-auth/pg";

import { timestamps } from "../../database/columns";
import {
  deliveryConfirmationMethodEnum,
  orderAssistanceChannelEnum,
  orderPlacementSourceEnum,
  orderStatusEnum,
} from "../../database/enums";
import { products } from "../catalog/catalogSchema";
import { familyProfiles } from "../families/familySchema";

const minorUnit = (name: string) => bigint(name, { mode: "number" });

export const carts = pgTable(
  "carts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    familyProfileId: uuid("family_profile_id")
      .notNull()
      .unique()
      .references(() => familyProfiles.id),
    ...timestamps(),
  },
  (table) => [
    index("carts_family_created_at_idx").on(
      table.familyProfileId,
      table.createdAt,
    ),
  ],
);

export const cartItems = pgTable(
  "cart_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    cartId: uuid("cart_id")
      .notNull()
      .references(() => carts.id),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id),
    quantity: integer("quantity").notNull(),
    ...timestamps(),
  },
  (table) => [
    uniqueIndex("cart_items_cart_product_unique").on(table.cartId, table.productId),
    check("cart_items_positive_quantity_check", sql`${table.quantity} > 0`),
  ],
);

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orderNumber: varchar("order_number", { length: 80 }).notNull(),
    submissionIdempotencyKey: varchar("submission_idempotency_key", {
      length: 160,
    }).notNull(),
    familyProfileId: uuid("family_profile_id")
      .notNull()
      .references(() => familyProfiles.id),
    placementSource: orderPlacementSourceEnum("placement_source")
      .default("family_self_service")
      .notNull(),
    assistanceChannel: orderAssistanceChannelEnum("assistance_channel"),
    assistanceNote: text("assistance_note"),
    status: orderStatusEnum("status").default("pending").notNull(),
    subtotalMinor: minorUnit("subtotal_minor").notNull(),
    totalMinor: minorUnit("total_minor").notNull(),
    currency: varchar("currency", { length: 3 }).default("MAD").notNull(),
    guardianLegalNameSnapshot: text("guardian_legal_name_snapshot").notNull(),
    deliveryAddressSnapshot: text("delivery_address_snapshot").notNull(),
    deliveryPhoneSnapshot: varchar("delivery_phone_snapshot", { length: 40 }),
    placedByUserId: text("placed_by_user_id")
      .notNull()
      .references(() => usersTable.id),
    approvedByUserId: text("approved_by_user_id").references(
      () => usersTable.id,
    ),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    rejectedByUserId: text("rejected_by_user_id").references(
      () => usersTable.id,
    ),
    rejectedAt: timestamp("rejected_at", { withTimezone: true }),
    rejectionReason: text("rejection_reason"),
    cancelledByUserId: text("cancelled_by_user_id").references(
      () => usersTable.id,
    ),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    cancellationReason: text("cancellation_reason"),
    preparationStartedAt: timestamp("preparation_started_at", {
      withTimezone: true,
    }),
    deliveryStartedAt: timestamp("delivery_started_at", {
      withTimezone: true,
    }),
    deliveryStartedByUserId: text("delivery_started_by_user_id").references(
      () => usersTable.id,
    ),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    deliveredByUserId: text("delivered_by_user_id").references(
      () => usersTable.id,
    ),
    deliveryConfirmationMethod: deliveryConfirmationMethodEnum(
      "delivery_confirmation_method",
    ),
    deliveryNote: text("delivery_note"),
    deliveryProofStoragePath: text("delivery_proof_storage_path"),
    deliveryProofMediaType: varchar("delivery_proof_media_type", {
      length: 100,
    }),
    deliveryProofByteSize: integer("delivery_proof_byte_size"),
    deliveryConfirmationIdempotencyKey: varchar(
      "delivery_confirmation_idempotency_key",
      { length: 160 },
    ).unique(),
    ...timestamps(),
  },
  (table) => [
    uniqueIndex("orders_order_number_unique").on(table.orderNumber),
    uniqueIndex("orders_submission_idempotency_key_unique").on(
      table.submissionIdempotencyKey,
    ),
    check("orders_currency_check", sql`${table.currency} = 'MAD'`),
    check(
      "orders_positive_totals_check",
      sql`${table.subtotalMinor} > 0 AND ${table.totalMinor} > 0 AND ${table.subtotalMinor} = ${table.totalMinor}`,
    ),
    check(
      "orders_assistance_context_check",
      sql`(
        (${table.placementSource} = 'family_self_service' AND ${table.assistanceChannel} IS NULL AND ${table.assistanceNote} IS NULL)
        OR
        (${table.placementSource} = 'operator_assisted' AND ${table.assistanceChannel} IS NOT NULL)
      )`,
    ),
    check(
      "orders_delivery_proof_complete_check",
      sql`(
        (${table.deliveryProofStoragePath} IS NULL AND ${table.deliveryProofMediaType} IS NULL AND ${table.deliveryProofByteSize} IS NULL)
        OR
        (${table.deliveryProofStoragePath} IS NOT NULL AND ${table.deliveryProofMediaType} IS NOT NULL AND ${table.deliveryProofByteSize} > 0)
      )`,
    ),
    index("orders_family_created_at_idx").on(
      table.familyProfileId,
      table.createdAt,
    ),
    index("orders_status_created_at_idx").on(table.status, table.createdAt),
  ],
);

export const orderPurchaseRecords = pgTable(
  "order_purchase_records",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id),
    merchantName: varchar("merchant_name", { length: 200 }).notNull(),
    receiptNumber: varchar("receipt_number", { length: 120 }),
    purchasedAt: timestamp("purchased_at", { withTimezone: true }).notNull(),
    actualTotalMinor: minorUnit("actual_total_minor").notNull(),
    currency: varchar("currency", { length: 3 }).default("MAD").notNull(),
    receiptStoragePath: text("receipt_storage_path").notNull(),
    receiptMediaType: varchar("receipt_media_type", { length: 100 }).notNull(),
    receiptByteSize: integer("receipt_byte_size").notNull(),
    recordedByUserId: text("recorded_by_user_id")
      .notNull()
      .references(() => usersTable.id),
    idempotencyKey: varchar("idempotency_key", { length: 160 })
      .notNull()
      .unique(),
    replacesPurchaseId: uuid("replaces_purchase_id").references(
      (): AnyPgColumn => orderPurchaseRecords.id,
    ),
    createdAt: timestamps().createdAt,
  },
  (table) => [
    check(
      "order_purchase_records_positive_total_check",
      sql`${table.actualTotalMinor} > 0`,
    ),
    check(
      "order_purchase_records_currency_check",
      sql`${table.currency} = 'MAD'`,
    ),
    check(
      "order_purchase_records_positive_receipt_size_check",
      sql`${table.receiptByteSize} > 0`,
    ),
    uniqueIndex("order_purchase_records_receipt_path_unique").on(
      table.receiptStoragePath,
    ),
    index("order_purchase_records_order_created_at_idx").on(
      table.orderId,
      table.createdAt,
    ),
    index("order_purchase_records_purchased_at_idx").on(table.purchasedAt),
  ],
);

export const orderPurchaseReversals = pgTable(
  "order_purchase_reversals",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    purchaseId: uuid("purchase_id")
      .notNull()
      .unique()
      .references(() => orderPurchaseRecords.id),
    reason: text("reason").notNull(),
    reversedByUserId: text("reversed_by_user_id")
      .notNull()
      .references(() => usersTable.id),
    idempotencyKey: varchar("idempotency_key", { length: 160 })
      .notNull()
      .unique(),
    createdAt: timestamps().createdAt,
  },
  (table) => [
    index("order_purchase_reversals_created_at_idx").on(table.createdAt),
  ],
);

export const orderItems = pgTable(
  "order_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id),
    productNameSnapshot: varchar("product_name_snapshot", {
      length: 200,
    }).notNull(),
    skuSnapshot: varchar("sku_snapshot", { length: 80 }).notNull(),
    unitPriceMinor: minorUnit("unit_price_minor").notNull(),
    quantity: integer("quantity").notNull(),
    lineTotalMinor: minorUnit("line_total_minor").notNull(),
    createdAt: timestamps().createdAt,
  },
  (table) => [
    check(
      "order_items_positive_values_check",
      sql`${table.unitPriceMinor} > 0 AND ${table.quantity} > 0 AND ${table.lineTotalMinor} > 0 AND ${table.lineTotalMinor} = ${table.unitPriceMinor} * ${table.quantity}`,
    ),
    index("order_items_order_id_idx").on(table.orderId),
  ],
);

export const orderStatusEvents = pgTable(
  "order_status_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id),
    fromStatus: orderStatusEnum("from_status"),
    toStatus: orderStatusEnum("to_status").notNull(),
    actorUserId: text("actor_user_id")
      .notNull()
      .references(() => usersTable.id),
    reason: text("reason"),
    createdAt: timestamps().createdAt,
  },
  (table) => [
    index("order_status_events_order_created_at_idx").on(
      table.orderId,
      table.createdAt,
    ),
  ],
);

export type Cart = typeof carts.$inferSelect;
export type CartItem = typeof cartItems.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
export type NewOrderItem = typeof orderItems.$inferInsert;
export type Order = typeof orders.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;
export type OrderStatus = Order["status"];
export type OrderStatusEvent = typeof orderStatusEvents.$inferSelect;
export type OrderPurchaseRecord = typeof orderPurchaseRecords.$inferSelect;
export type NewOrderPurchaseRecord = typeof orderPurchaseRecords.$inferInsert;
export type OrderPurchaseReversal = typeof orderPurchaseReversals.$inferSelect;
export type NewOrderPurchaseReversal =
  typeof orderPurchaseReversals.$inferInsert;

export const orderSchema = {
  carts,
  cartItems,
  orders,
  orderItems,
  orderStatusEvents,
  orderPurchaseRecords,
  orderPurchaseReversals,
};
