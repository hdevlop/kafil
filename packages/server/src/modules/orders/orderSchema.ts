import { sql } from "drizzle-orm";
import {
  bigint,
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
import { orderStatusEnum } from "../../database/enums";
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
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
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
    index("orders_family_created_at_idx").on(
      table.familyProfileId,
      table.createdAt,
    ),
    index("orders_status_created_at_idx").on(table.status, table.createdAt),
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

export const orderSchema = {
  carts,
  cartItems,
  orders,
  orderItems,
  orderStatusEvents,
};
