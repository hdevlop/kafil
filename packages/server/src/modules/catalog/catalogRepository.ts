import { and, asc, desc, eq, ilike, sql } from "drizzle-orm";
import { Repository } from "najm-core";
import { DB } from "najm-database";

import type { KafilDatabase } from "../../database/types";
import {
  categories,
  inventoryBalances,
  inventoryLedgerEntries,
  type NewCategory,
  type NewInventoryLedgerEntry,
  type NewProduct,
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
}

function productFilter(filters: ProductFilters) {
  const conditions = [
    filters.categoryId ? eq(products.categoryId, filters.categoryId) : undefined,
    filters.status ? eq(products.status, filters.status) : undefined,
    filters.search ? ilike(products.name, `%${filters.search}%`) : undefined,
  ].filter((condition) => condition !== undefined);
  return conditions.length ? and(...conditions) : undefined;
}
