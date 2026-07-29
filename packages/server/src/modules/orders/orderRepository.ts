import {
  and,
  desc,
  eq,
  getTableColumns,
  gte,
  isNotNull,
  isNull,
  lte,
  sql,
} from "drizzle-orm";
import { usersTable } from "najm-auth/pg";
import { Repository } from "najm-core";
import { DB } from "najm-database";

import type { KafilDatabase } from "../../database/types";
import { categories, products } from "../catalog/catalogSchema";
import { familyProfiles } from "../families/familySchema";
import { sponsorProfiles } from "../sponsors/sponsorSchema";
import { supportAssignments } from "../supportAssignments/supportAssignmentSchema";
import {
  cartItems,
  carts,
  type NewOrderPurchaseRecord,
  type NewOrderPurchaseReversal,
  type NewOrder,
  type NewOrderItem,
  orderItems,
  orderPurchaseRecords,
  orderPurchaseReversals,
  type OrderStatus,
  orderStatusEvents,
  orders,
} from "./orderSchema";

export interface OrderFilters {
  familyProfileId?: string;
  status?: OrderStatus;
  from?: Date;
  to?: Date;
}

const cartItemSelection = {
  id: cartItems.id,
  productId: cartItems.productId,
  quantity: cartItems.quantity,
  createdAt: cartItems.createdAt,
  updatedAt: cartItems.updatedAt,
  productName: products.name,
  sku: products.sku,
  priceMinor: products.priceMinor,
  currency: products.currency,
  productStatus: products.status,
  categoryStatus: categories.status,
};

const operatorOrderSelection = {
  ...getTableColumns(orders),
  familyImage: usersTable.image,
  articleCount: sql<number>`coalesce((
    select sum(${orderItems.quantity})
    from ${orderItems}
    where ${orderItems.orderId} = ${orders.id}
  ), 0)::int`,
};

@Repository("default")
export class CartRepository {
  @DB() private db!: KafilDatabase;

  async findByFamilyId(familyProfileId: string) {
    const [cart] = await this.db
      .select()
      .from(carts)
      .where(eq(carts.familyProfileId, familyProfileId))
      .limit(1);
    return cart;
  }

  async createForFamily(familyProfileId: string) {
    await this.db
      .insert(carts)
      .values({ familyProfileId })
      .onConflictDoNothing({ target: carts.familyProfileId });
    return this.findByFamilyId(familyProfileId);
  }

  async lockByFamilyId(familyProfileId: string) {
    const [cart] = await this.db
      .select()
      .from(carts)
      .where(eq(carts.familyProfileId, familyProfileId))
      .limit(1)
      .for("update");
    return cart;
  }

  listItems(cartId: string) {
    return this.db
      .select(cartItemSelection)
      .from(cartItems)
      .innerJoin(products, eq(cartItems.productId, products.id))
      .innerJoin(categories, eq(products.categoryId, categories.id))
      .where(eq(cartItems.cartId, cartId))
      .orderBy(cartItems.createdAt);
  }

  async findItem(cartId: string, productId: string) {
    const [item] = await this.db
      .select()
      .from(cartItems)
      .where(and(eq(cartItems.cartId, cartId), eq(cartItems.productId, productId)))
      .limit(1);
    return item;
  }

  async createItem(cartId: string, productId: string, quantity: number) {
    const [item] = await this.db
      .insert(cartItems)
      .values({ cartId, productId, quantity })
      .returning();
    return item;
  }

  async setItemQuantity(id: string, quantity: number) {
    const [item] = await this.db
      .update(cartItems)
      .set({ quantity, updatedAt: new Date() })
      .where(eq(cartItems.id, id))
      .returning();
    return item;
  }

  async removeItem(cartId: string, productId: string) {
    const [item] = await this.db
      .delete(cartItems)
      .where(and(eq(cartItems.cartId, cartId), eq(cartItems.productId, productId)))
      .returning();
    return item;
  }

  clear(cartId: string) {
    return this.db.delete(cartItems).where(eq(cartItems.cartId, cartId));
  }
}

@Repository("default")
export class OrderRepository {
  @DB() private db!: KafilDatabase;

  list(limit: number, offset: number, filters: OrderFilters) {
    const condition = orderFilter(filters);
    const query = this.db
      .select(operatorOrderSelection)
      .from(orders)
      .innerJoin(
        familyProfiles,
        eq(orders.familyProfileId, familyProfiles.id),
      )
      .innerJoin(usersTable, eq(familyProfiles.userId, usersTable.id))
      .orderBy(desc(orders.createdAt))
      .limit(limit)
      .offset(offset);
    return condition ? query.where(condition) : query;
  }

  listByFamilyId(
    familyProfileId: string,
    limit: number,
    offset: number,
    status?: OrderStatus,
  ) {
    const condition = status
      ? and(
          eq(orders.familyProfileId, familyProfileId),
          eq(orders.status, status),
        )
      : eq(orders.familyProfileId, familyProfileId);
    return this.db
      .select()
      .from(orders)
      .where(condition)
      .orderBy(desc(orders.createdAt))
      .limit(limit)
      .offset(offset);
  }

  listSupportedBySponsor(
    sponsorUserId: string,
    limit: number,
    offset: number,
    status?: OrderStatus,
  ) {
    const condition = status
      ? and(
          eq(sponsorProfiles.userId, sponsorUserId),
          eq(supportAssignments.status, "active"),
          eq(orders.status, status),
        )
      : and(
          eq(sponsorProfiles.userId, sponsorUserId),
          eq(supportAssignments.status, "active"),
        );
    return this.db
      .selectDistinct({
        id: orders.id,
        orderNumber: orders.orderNumber,
        status: orders.status,
        subtotalMinor: orders.subtotalMinor,
        totalMinor: orders.totalMinor,
        currency: orders.currency,
        placedAt: orders.createdAt,
        approvedAt: orders.approvedAt,
        preparationStartedAt: orders.preparationStartedAt,
        deliveryStartedAt: orders.deliveryStartedAt,
        deliveredAt: orders.deliveredAt,
        deliveryProofRecorded: sql<boolean>`${orders.deliveryProofStoragePath} IS NOT NULL`,
      })
      .from(orders)
      .innerJoin(
        supportAssignments,
        eq(orders.familyProfileId, supportAssignments.familyProfileId),
      )
      .innerJoin(
        sponsorProfiles,
        eq(supportAssignments.sponsorProfileId, sponsorProfiles.id),
      )
      .where(condition)
      .orderBy(desc(orders.createdAt))
      .limit(limit)
      .offset(offset);
  }

  async findById(id: string) {
    const [order] = await this.db.select().from(orders).where(eq(orders.id, id)).limit(1);
    return order;
  }

  async findByIdempotencyKey(submissionIdempotencyKey: string) {
    const [order] = await this.db
      .select()
      .from(orders)
      .where(eq(orders.submissionIdempotencyKey, submissionIdempotencyKey))
      .limit(1);
    return order;
  }

  async findOwnedById(id: string, familyProfileId: string) {
    const [order] = await this.db
      .select()
      .from(orders)
      .where(
        and(eq(orders.id, id), eq(orders.familyProfileId, familyProfileId)),
      )
      .limit(1);
    return order;
  }

  async lockById(id: string) {
    const [order] = await this.db
      .select()
      .from(orders)
      .where(eq(orders.id, id))
      .limit(1)
      .for("update");
    return order;
  }

  async create(data: NewOrder) {
    const [order] = await this.db.insert(orders).values(data).returning();
    return order;
  }

  createItems(items: NewOrderItem[]) {
    return this.db.insert(orderItems).values(items).returning();
  }

  listItems(orderId: string) {
    return this.db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, orderId))
      .orderBy(orderItems.createdAt);
  }

  listStatusEvents(orderId: string) {
    return this.db
      .select()
      .from(orderStatusEvents)
      .where(eq(orderStatusEvents.orderId, orderId))
      .orderBy(orderStatusEvents.createdAt);
  }

  async appendStatusEvent(input: {
    orderId: string;
    fromStatus: OrderStatus | null;
    toStatus: OrderStatus;
    actorUserId: string;
    reason: string | null;
  }) {
    const [event] = await this.db.insert(orderStatusEvents).values(input).returning();
    return event;
  }

  async update(
    id: string,
    data: Partial<
      Pick<
        NewOrder,
        | "status"
        | "approvedByUserId"
        | "approvedAt"
        | "rejectedByUserId"
        | "rejectedAt"
        | "rejectionReason"
        | "cancelledByUserId"
        | "cancelledAt"
        | "cancellationReason"
        | "preparationStartedAt"
        | "deliveryStartedAt"
        | "deliveryStartedByUserId"
        | "deliveredAt"
        | "deliveredByUserId"
        | "deliveryConfirmationMethod"
        | "deliveryNote"
        | "deliveryProofStoragePath"
        | "deliveryProofMediaType"
        | "deliveryProofByteSize"
        | "deliveryConfirmationIdempotencyKey"
      >
    >,
  ) {
    const [order] = await this.db
      .update(orders)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(orders.id, id))
      .returning();
    return order;
  }

  async hardDelete(id: string) {
    const order = await this.findById(id);
    if (!order) return undefined;
    await this.db.delete(orderStatusEvents).where(eq(orderStatusEvents.orderId, id));
    await this.db.delete(orderItems).where(eq(orderItems.orderId, id));
    await this.db.delete(orders).where(eq(orders.id, id));
    return order;
  }
}

@Repository("default")
export class OrderPurchaseRepository {
  @DB() private db!: KafilDatabase;

  async findByIdempotencyKey(idempotencyKey: string) {
    const [purchase] = await this.db
      .select()
      .from(orderPurchaseRecords)
      .where(eq(orderPurchaseRecords.idempotencyKey, idempotencyKey))
      .limit(1);
    return purchase;
  }

  async findActiveByOrderId(orderId: string) {
    const [purchase] = await this.db
      .select({ purchase: orderPurchaseRecords })
      .from(orderPurchaseRecords)
      .leftJoin(
        orderPurchaseReversals,
        eq(orderPurchaseReversals.purchaseId, orderPurchaseRecords.id),
      )
      .where(
        and(
          eq(orderPurchaseRecords.orderId, orderId),
          isNull(orderPurchaseReversals.id),
        ),
      )
      .orderBy(desc(orderPurchaseRecords.createdAt))
      .limit(1);
    return purchase?.purchase;
  }

  listByOrderId(orderId: string) {
    return this.db
      .select({
        purchase: orderPurchaseRecords,
        reversal: orderPurchaseReversals,
      })
      .from(orderPurchaseRecords)
      .leftJoin(
        orderPurchaseReversals,
        eq(orderPurchaseReversals.purchaseId, orderPurchaseRecords.id),
      )
      .where(eq(orderPurchaseRecords.orderId, orderId))
      .orderBy(desc(orderPurchaseRecords.createdAt));
  }

  async create(data: NewOrderPurchaseRecord) {
    const [purchase] = await this.db
      .insert(orderPurchaseRecords)
      .values(data)
      .returning();
    return purchase;
  }

  async reverse(data: NewOrderPurchaseReversal) {
    const [reversal] = await this.db
      .insert(orderPurchaseReversals)
      .values(data)
      .returning();
    return reversal;
  }

  async isReceiptReferenced(path: string) {
    const [purchase] = await this.db
      .select({ id: orderPurchaseRecords.id })
      .from(orderPurchaseRecords)
      .where(eq(orderPurchaseRecords.receiptStoragePath, path))
      .limit(1);
    return Boolean(purchase);
  }

  async isDeliveryProofReferenced(path: string) {
    const [order] = await this.db
      .select({ id: orders.id })
      .from(orders)
      .where(eq(orders.deliveryProofStoragePath, path))
      .limit(1);
    return Boolean(order);
  }

  async listReferencedEvidencePaths() {
    const [receipts, proofs] = await Promise.all([
      this.db
        .select({ path: orderPurchaseRecords.receiptStoragePath })
        .from(orderPurchaseRecords),
      this.db
        .select({ path: orders.deliveryProofStoragePath })
        .from(orders)
        .where(isNotNull(orders.deliveryProofStoragePath)),
    ]);
    return [
      ...receipts.map(({ path }) => path),
      ...proofs.flatMap(({ path }) => (path ? [path] : [])),
    ];
  }
}

function orderFilter(filters: OrderFilters) {
  const conditions = [
    filters.familyProfileId
      ? eq(orders.familyProfileId, filters.familyProfileId)
      : undefined,
    filters.status ? eq(orders.status, filters.status) : undefined,
    filters.from ? gte(orders.createdAt, filters.from) : undefined,
    filters.to ? lte(orders.createdAt, filters.to) : undefined,
  ].filter((condition) => condition !== undefined);
  return conditions.length ? and(...conditions) : undefined;
}
