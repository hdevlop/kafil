import { and, asc, desc, eq, ilike, inArray, sql } from "drizzle-orm";
import { Repository } from "najm-core";
import { DB } from "najm-database";

import type { KafilDatabase } from "../../database/types";
import {
  cartItems,
  orderItems,
} from "../orders/orderSchema";
import {
  categories,
  inventoryBalances,
  inventoryLedgerEntries,
  type NewCategory,
  type NewInventoryLedgerEntry,
  type NewProduct,
  type Product,
  products,
} from "./catalogSchema";

export interface CategoryFilters {
  status?: "active" | "inactive";
}

export interface ProductFilters {
  categoryId?: string;
  status?: "active" | "inactive";
  search?: string;
}

const catalogProductSelection = {
  id: products.id,
  categoryId: products.categoryId,
  categoryName: categories.name,
  categorySlug: categories.slug,
  sku: products.sku,
  name: products.name,
  description: products.description,
  priceMinor: products.priceMinor,
  currency: products.currency,
  imageUrl: products.imageUrl,
  status: products.status,
  createdAt: products.createdAt,
  updatedAt: products.updatedAt,
};

@Repository("default")
export class CategoryRepository {
  @DB() private db!: KafilDatabase;

  list(limit: number, offset: number, filters: CategoryFilters) {
    const query = this.db
      .select()
      .from(categories)
      .orderBy(asc(categories.sortOrder), asc(categories.name))
      .limit(limit)
      .offset(offset);
    return filters.status ? query.where(eq(categories.status, filters.status)) : query;
  }

  listActive(limit: number, offset: number) {
    return this.list(limit, offset, { status: "active" });
  }

  async findById(id: string) {
    const [category] = await this.db
      .select()
      .from(categories)
      .where(eq(categories.id, id))
      .limit(1);
    return category;
  }

  async create(data: NewCategory) {
    const [category] = await this.db.insert(categories).values(data).returning();
    return category;
  }

  async update(id: string, data: Partial<NewCategory>) {
    const [category] = await this.db
      .update(categories)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(categories.id, id))
      .returning();
    return category;
  }

  async setStatus(id: string, status: "active" | "inactive") {
    const [category] = await this.db
      .update(categories)
      .set({ status, updatedAt: new Date() })
      .where(eq(categories.id, id))
      .returning();
    return category;
  }

  /**
   * Hard-delete the category row. Caller is responsible for emptying dependents
   * (products, their cart items and inventory balances) and for validating
   * pristineness beforehand. Runs inside the surrounding service transaction.
   */
  async hardDelete(id: string) {
    const [category] = await this.db
      .delete(categories)
      .where(eq(categories.id, id))
      .returning();
    return category;
  }
}

@Repository("default")
export class ProductRepository {
  @DB() private db!: KafilDatabase;

  list(limit: number, offset: number, filters: ProductFilters) {
    const condition = productFilter(filters);
    const query = this.db
      .select(catalogProductSelection)
      .from(products)
      .innerJoin(categories, eq(products.categoryId, categories.id))
      .orderBy(asc(products.name))
      .limit(limit)
      .offset(offset);
    return condition ? query.where(condition) : query;
  }

  listActive(limit: number, offset: number, filters: ProductFilters) {
    const condition = and(
      eq(products.status, "active"),
      eq(categories.status, "active"),
      productFilter({ ...filters, status: undefined }),
    );
    return this.db
      .select(catalogProductSelection)
      .from(products)
      .innerJoin(categories, eq(products.categoryId, categories.id))
      .where(condition)
      .orderBy(asc(products.name))
      .limit(limit)
      .offset(offset);
  }

  async findById(id: string) {
    const [product] = await this.db
      .select(catalogProductSelection)
      .from(products)
      .innerJoin(categories, eq(products.categoryId, categories.id))
      .where(eq(products.id, id))
      .limit(1);
    return product;
  }

  async findActiveById(id: string) {
    const [product] = await this.db
      .select(catalogProductSelection)
      .from(products)
      .innerJoin(categories, eq(products.categoryId, categories.id))
      .where(
        and(
          eq(products.id, id),
          eq(products.status, "active"),
          eq(categories.status, "active"),
        ),
      )
      .limit(1);
    return product;
  }

  async create(data: NewProduct) {
    const [product] = await this.db.insert(products).values(data).returning();
    return product;
  }

  async update(id: string, data: Partial<NewProduct>) {
    const [product] = await this.db
      .update(products)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(products.id, id))
      .returning();
    return product;
  }

  async setStatus(id: string, status: "active" | "inactive") {
    const [product] = await this.db
      .update(products)
      .set({ status, updatedAt: new Date() })
      .where(eq(products.id, id))
      .returning();
    return product;
  }

  /** Locks all products under a category for the duration of the surrounding
   * transaction. Reads id + name + imageUrl so the caller can audit / cleanup. */
  async lockByCategoryIdForDelete(categoryId: string) {
    return this.db
      .select({
        id: products.id,
        name: products.name,
        imageUrl: products.imageUrl,
        sku: products.sku,
      })
      .from(products)
      .where(eq(products.categoryId, categoryId))
      .for("update");
  }

  /** Count order_items referencing any of the given product ids. */
  async countOrderItemsByProductIds(productIds: string[]) {
    if (!productIds.length) return 0;
    const rows = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(orderItems)
      .where(inArray(orderItems.productId, productIds));
    return rows[0]?.count ?? 0;
  }

  async productIdsWithOrderHistory(productIds: string[]) {
    if (!productIds.length) return [];
    const rows = await this.db
      .selectDistinct({ productId: orderItems.productId })
      .from(orderItems)
      .where(inArray(orderItems.productId, productIds));
    return rows.map(({ productId }) => productId);
  }

  /** Count inventory_ledger_entries referencing any of the given product ids.
   * This MUST stay as a positive assertion that a delete path is forbidden. */
  async countInventoryLedgerByProductIds(productIds: string[]) {
    if (!productIds.length) return 0;
    const rows = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(inventoryLedgerEntries)
      .where(inArray(inventoryLedgerEntries.productId, productIds));
    return rows[0]?.count ?? 0;
  }

  async productIdsWithInventoryLedger(productIds: string[]) {
    if (!productIds.length) return [];
    const rows = await this.db
      .selectDistinct({ productId: inventoryLedgerEntries.productId })
      .from(inventoryLedgerEntries)
      .where(inArray(inventoryLedgerEntries.productId, productIds));
    return rows.map(({ productId }) => productId);
  }

  /** Hard-delete the product row. Caller empties cart items + inventory
   * balance first and runs validation upfront. */
  async hardDelete(id: string): Promise<Product | undefined> {
    const [product] = await this.db
      .delete(products)
      .where(eq(products.id, id))
      .returning();
    return product;
  }

  /** Hard-delete a batch of product rows by id. Used when a category is being
   * deleted and its empty (pristine) products cascade with it. */
  async hardDeleteByIds(ids: string[]): Promise<number> {
    if (!ids.length) return 0;
    const result = await this.db
      .delete(products)
      .where(inArray(products.id, ids));
    return result.rowCount ?? 0;
  }

  /** Removes all cart items referencing any of the supplied products. */
  async deleteCartItemsByProductIds(productIds: string[]) {
    if (!productIds.length) return 0;
    const result = await this.db
      .delete(cartItems)
      .where(inArray(cartItems.productId, productIds));
    return result.rowCount ?? 0;
  }
}

@Repository("default")
export class InventoryRepository {
  @DB() private db!: KafilDatabase;

  async createForProduct(productId: string) {
    await this.db
      .insert(inventoryBalances)
      .values({ productId })
      .onConflictDoNothing({ target: inventoryBalances.productId });
    return this.findByProductId(productId);
  }

  async findByProductId(productId: string) {
    const [balance] = await this.db
      .select()
      .from(inventoryBalances)
      .where(eq(inventoryBalances.productId, productId))
      .limit(1);
    return balance;
  }

  async lockByProductId(productId: string) {
    const [balance] = await this.db
      .select()
      .from(inventoryBalances)
      .where(eq(inventoryBalances.productId, productId))
      .limit(1)
      .for("update");
    return balance;
  }

  async updateBalance(
    productId: string,
    balance: { onHandQuantity: number; reservedQuantity: number },
  ) {
    const [updated] = await this.db
      .update(inventoryBalances)
      .set({
        ...balance,
        version: sql`${inventoryBalances.version} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(inventoryBalances.productId, productId))
      .returning();
    return updated;
  }

  async findLedgerByIdempotencyKey(idempotencyKey: string) {
    const [entry] = await this.db
      .select()
      .from(inventoryLedgerEntries)
      .where(eq(inventoryLedgerEntries.idempotencyKey, idempotencyKey))
      .limit(1);
    return entry;
  }

  listLedger(productId: string, limit: number, offset: number) {
    return this.db
      .select()
      .from(inventoryLedgerEntries)
      .where(eq(inventoryLedgerEntries.productId, productId))
      .orderBy(desc(inventoryLedgerEntries.createdAt))
      .limit(limit)
      .offset(offset);
  }

  async appendLedger(data: NewInventoryLedgerEntry) {
    const [entry] = await this.db
      .insert(inventoryLedgerEntries)
      .values(data)
      .returning();
    return entry;
  }

  /** List zero-or-more balance rows for the supplied product ids with
   *  `FOR UPDATE`. The caller is expected to own the surrounding transaction
   *  so the locks are released on commit/rollback. */
  async lockBalancesByProductIds(productIds: string[]) {
    if (!productIds.length) return [];
    return this.db
      .select()
      .from(inventoryBalances)
      .where(inArray(inventoryBalances.productId, productIds))
      .for("update");
  }

  /** Deletes the inventory_balances rows for the supplied product ids.
   *  Intended for use only on pristine products — the validator must guarantee
   *  no order history, no ledger activity, zero balance before this runs. */
  async deleteBalancesByProductIds(productIds: string[]) {
    if (!productIds.length) return 0;
    const result = await this.db
      .delete(inventoryBalances)
      .where(inArray(inventoryBalances.productId, productIds));
    return result.rowCount ?? 0;
  }
}

function productFilter(filters: ProductFilters) {
  const conditions = [
    filters.categoryId ? eq(products.categoryId, filters.categoryId) : undefined,
    filters.status ? eq(products.status, filters.status) : undefined,
    filters.search ? ilike(products.name, `%${filters.search}%`) : undefined,
  ].filter((condition) => condition !== undefined);
  return conditions.length ? and(...conditions) : undefined;
}
