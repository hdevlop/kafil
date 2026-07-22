import { sql } from "drizzle-orm";
import {
  bigint,
  type AnyPgColumn,
  check,
  index,
  integer,
  pgTable,
  text,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { usersTable } from "najm-auth/pg";

import { timestamps } from "../../database/columns";
import {
  categoryStatusEnum,
  inventoryLedgerEntryTypeEnum,
  productStatusEnum,
} from "../../database/enums";

const quantity = (name: string) => integer(name);
const minorUnit = (name: string) => bigint(name, { mode: "number" });

export const categories = pgTable(
  "categories",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 160 }).notNull(),
    slug: varchar("slug", { length: 160 }).notNull(),
    description: text("description"),
    image: varchar("image", { length: 2_000 }),
    status: categoryStatusEnum("status").default("active").notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    ...timestamps(),
  },
  (table) => [
    uniqueIndex("categories_slug_unique").on(table.slug),
    index("categories_status_sort_order_idx").on(table.status, table.sortOrder),
  ],
);

export const products = pgTable(
  "products",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id),
    sku: varchar("sku", { length: 80 }).notNull(),
    name: varchar("name", { length: 200 }).notNull(),
    description: text("description"),
    priceMinor: minorUnit("price_minor").notNull(),
    currency: varchar("currency", { length: 3 }).default("MAD").notNull(),
    imageUrl: varchar("image_url", { length: 2_000 }),
    status: productStatusEnum("status").default("active").notNull(),
    ...timestamps(),
  },
  (table) => [
    uniqueIndex("products_sku_unique").on(table.sku),
    check("products_currency_check", sql`${table.currency} = 'MAD'`),
    check("products_positive_price_check", sql`${table.priceMinor} > 0`),
    index("products_category_status_idx").on(table.categoryId, table.status),
    index("products_status_name_idx").on(table.status, table.name),
  ],
);

export const inventoryBalances = pgTable(
  "inventory_balances",
  {
    productId: uuid("product_id")
      .primaryKey()
      .references(() => products.id),
    onHandQuantity: quantity("on_hand_quantity").default(0).notNull(),
    reservedQuantity: quantity("reserved_quantity").default(0).notNull(),
    version: integer("version").default(0).notNull(),
    ...timestamps(),
  },
  (table) => [
    check(
      "inventory_balances_quantity_check",
      sql`${table.onHandQuantity} >= 0 AND ${table.reservedQuantity} >= 0 AND ${table.reservedQuantity} <= ${table.onHandQuantity}`,
    ),
  ],
);

export const inventoryLedgerEntries = pgTable(
  "inventory_ledger_entries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id),
    entryType: inventoryLedgerEntryTypeEnum("entry_type").notNull(),
    quantity: quantity("quantity").notNull(),
    onHandAfter: quantity("on_hand_after").notNull(),
    reservedAfter: quantity("reserved_after").notNull(),
    sourceType: varchar("source_type", { length: 80 }).notNull(),
    sourceId: text("source_id").notNull(),
    idempotencyKey: varchar("idempotency_key", { length: 160 })
      .notNull()
      .unique(),
    actorUserId: text("actor_user_id").references(() => usersTable.id, {
      onDelete: "set null",
    }),
    reason: text("reason"),
    reversesEntryId: uuid("reverses_entry_id").references(
      (): AnyPgColumn => inventoryLedgerEntries.id,
    ),
    createdAt: timestamps().createdAt,
  },
  (table) => [
    check("inventory_ledger_entries_non_zero_quantity_check", sql`${table.quantity} <> 0`),
    check(
      "inventory_ledger_entries_balance_check",
      sql`${table.onHandAfter} >= 0 AND ${table.reservedAfter} >= 0 AND ${table.reservedAfter} <= ${table.onHandAfter}`,
    ),
    index("inventory_ledger_entries_product_created_at_idx").on(
      table.productId,
      table.createdAt,
    ),
    index("inventory_ledger_entries_source_idx").on(table.sourceType, table.sourceId),
  ],
);

export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
export type InventoryBalance = typeof inventoryBalances.$inferSelect;
export type NewInventoryLedgerEntry = typeof inventoryLedgerEntries.$inferInsert;

export const catalogSchema = {
  categories,
  products,
  inventoryBalances,
  inventoryLedgerEntries,
};
