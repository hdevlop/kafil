import { HttpError, Service } from "najm-core";
import { Transaction } from "najm-database";

import { AuditService } from "../audit/auditService";
import {
  BudgetAccountRepository,
  BudgetLedgerRepository,
  MonthlyBudgetLimitRepository,
} from "../budgets/budgetRepository";
import { applyBudgetBalanceDelta } from "../budgets/money";
import { CatalogService, ProductRepository } from "../catalog";
import { OutboxService } from "../outbox/outboxService";
import { FundingService } from "../settings/fundingService";
import {
  type CartItemDto,
  cartItemDto,
  type FamilyCancelOrderDto,
  familyCancelOrderDto,
  type OrderListQuery,
  orderListQuery,
  type OrderReasonDto,
  orderReasonDto,
  type OwnOrderListQuery,
  ownOrderListQuery,
  type SetCartItemQuantityDto,
  setCartItemQuantityDto,
  type SubmitOrderDto,
  submitOrderDto,
} from "./orderDto";
import { CartRepository, OrderRepository } from "./orderRepository";
import type { Order } from "./orderSchema";
import { OrderValidator } from "./orderValidator";

@Service()
export class OrderService {
  constructor(
    private readonly carts: CartRepository,
    private readonly orders: OrderRepository,
    private readonly products: ProductRepository,
    private readonly catalog: CatalogService,
    private readonly accounts: BudgetAccountRepository,
    private readonly ledger: BudgetLedgerRepository,
    private readonly limits: MonthlyBudgetLimitRepository,
    private readonly audits: AuditService,
    private readonly outbox: OutboxService,
    private readonly validator: OrderValidator,
    private readonly funding: FundingService,
  ) {}

  async getOwnCart(userId: string) {
    const family = await this.validator.ensureFamily(userId);
    const cart = await this.getOrCreateCart(family.id);
    return this.cartProjection(cart, await this.carts.listItems(cart.id));
  }

  async list(userQuery: OrderListQuery) {
    const { limit, offset, ...filters } = orderListQuery.parse(userQuery ?? {});
    return this.orders.list(limit, offset, filters);
  }

  async get(id: string) {
    const order = await this.validator.ensureOrderExists(id);
    return this.orderDetail(order);
  }

  async listOwn(userId: string, userQuery: OwnOrderListQuery) {
    const family = await this.validator.ensureFamily(userId);
    const { limit, offset, status } = ownOrderListQuery.parse(userQuery ?? {});
    return this.orders.listByFamilyId(
      family.id,
      limit,
      offset,
      status,
    );
  }

  async getOwn(id: string, userId: string) {
    const { order } = await this.validator.ensureOrderOwnedByFamily(id, userId);
    return this.orderDetail(order);
  }

  async listSupported(userId: string, userQuery: OwnOrderListQuery) {
    const { limit, offset, status } = ownOrderListQuery.parse(userQuery ?? {});
    const summaries = await this.orders.listSupportedBySponsor(
      userId,
      limit,
      offset,
      status,
    );
    return Promise.all(
      summaries.map(async (order) => ({
        ...order,
        items: (await this.orders.listItems(order.id)).map((item) => ({
          productName: item.productNameSnapshot,
          sku: item.skuSnapshot,
          quantity: item.quantity,
          unitPriceMinor: item.unitPriceMinor,
          lineTotalMinor: item.lineTotalMinor,
        })),
      })),
    );
  }

  @Transaction({ retries: 2 })
  async addCartItem(userId: string, data: CartItemDto) {
    const family = await this.validator.ensureFamily(userId);
    const input = cartItemDto.parse(data);
    await this.ensureActiveProduct(input.productId);
    const cart = await this.lockCart(family.id);
    const existing = await this.carts.findItem(cart.id, input.productId);
    if (existing) {
      const quantity = existing.quantity + input.quantity;
      if (!Number.isSafeInteger(quantity) || quantity > 1_000) {
        HttpError.conflict("Cart quantity exceeds the allowed maximum");
      }
      await this.carts.setItemQuantity(existing.id, quantity);
    } else {
      await this.carts.createItem(cart.id, input.productId, input.quantity);
    }
    return this.cartProjection(cart, await this.carts.listItems(cart.id));
  }

  @Transaction({ retries: 2 })
  async setOwnCartItemQuantity(
    userId: string,
    productId: string,
    data: SetCartItemQuantityDto,
  ) {
    const family = await this.validator.ensureFamily(userId);
    const input = setCartItemQuantityDto.parse(data);
    await this.ensureActiveProduct(productId);
    const cart = await this.lockCart(family.id);
    const item = await this.carts.findItem(cart.id, productId);
    if (!item) {
      HttpError.notFound("Cart item not found");
    }
    await this.carts.setItemQuantity(item.id, input.quantity);
    return this.cartProjection(cart, await this.carts.listItems(cart.id));
  }

  @Transaction({ retries: 2 })
  async removeOwnCartItem(userId: string, productId: string) {
    const family = await this.validator.ensureFamily(userId);
    const cart = await this.lockCart(family.id);
    const item = await this.carts.removeItem(cart.id, productId);
    if (!item) {
      HttpError.notFound("Cart item not found");
    }
    return this.cartProjection(cart, await this.carts.listItems(cart.id));
  }

  @Transaction({ retries: 2 })
  async clearOwnCart(userId: string) {
    const family = await this.validator.ensureFamily(userId);
    const cart = await this.lockCart(family.id);
    await this.carts.clear(cart.id);
    return this.cartProjection(cart, []);
  }

  @Transaction({ retries: 2 })
  async submit(userId: string, data: SubmitOrderDto) {
    const input = submitOrderDto.parse(data);
    const family = await this.validator.ensureFamily(userId);
    await this.funding.ensureOrderEligible(family.id);
    const existing = await this.orders.findByIdempotencyKey(input.idempotencyKey);
    if (existing) {
      this.validator.ensureSameFamily(
        family.id,
        existing.familyProfileId,
      );
      return this.orderDetail(existing);
    }

    const cart = await this.lockCart(family.id);
    const repeated = await this.orders.findByIdempotencyKey(input.idempotencyKey);
    if (repeated) {
      this.validator.ensureSameFamily(
        family.id,
        repeated.familyProfileId,
      );
      return this.orderDetail(repeated);
    }
    const cartItems = await this.carts.listItems(cart.id);
    if (!cartItems.length) {
      HttpError.conflict("Cannot submit an empty cart");
    }

    const valuedItems = [] as Array<{
      productId: string;
      productName: string;
      sku: string;
      unitPriceMinor: number;
      quantity: number;
      lineTotalMinor: number;
    }>;
    for (const item of [...cartItems].sort((left, right) =>
      left.productId.localeCompare(right.productId),
    )) {
      const product = await this.products.findActiveById(item.productId);
      if (!product) {
        HttpError.conflict("A cart product is no longer available");
      }
      const lineTotalMinor = multiplyMinor(product.priceMinor, item.quantity);
      valuedItems.push({
        productId: item.productId,
        productName: product.name,
        sku: product.sku,
        unitPriceMinor: product.priceMinor,
        quantity: item.quantity,
        lineTotalMinor,
      });
    }
    const totalMinor = sumMinor(valuedItems.map((item) => item.lineTotalMinor));

    const order = await this.orders.create({
      orderNumber: orderNumber(),
      submissionIdempotencyKey: input.idempotencyKey,
      familyProfileId: family.id,
      status: "pending",
      subtotalMinor: totalMinor,
      totalMinor,
      currency: "MAD",
      guardianLegalNameSnapshot: family.guardianLegalName,
      deliveryAddressSnapshot: family.exactAddress,
      deliveryPhoneSnapshot: family.phone,
      placedByUserId: userId,
    });
    await this.orders.createItems(
      valuedItems.map((item) => ({
        orderId: order.id,
        productId: item.productId,
        productNameSnapshot: item.productName,
        skuSnapshot: item.sku,
        unitPriceMinor: item.unitPriceMinor,
        quantity: item.quantity,
        lineTotalMinor: item.lineTotalMinor,
      })),
    );

    for (const item of valuedItems) {
      await this.catalog.reserve({
        productId: item.productId,
        quantity: item.quantity,
        sourceId: order.id,
        idempotencyKey: `order:${order.id}:inventory:reserve:${item.productId}`,
      });
    }
    await this.reserveBudget(order, userId);
    await this.orders.appendStatusEvent({
      orderId: order.id,
      fromStatus: null,
      toStatus: "pending",
      actorUserId: userId,
      reason: null,
    });
    await this.audits.record({
      action: "order.submitted",
      actorUserId: userId,
      metadata: { totalMinor, itemCount: valuedItems.length },
      resource: "orders",
      resourceId: order.id,
    });
    await this.outbox.enqueue({
      topic: "order.submitted",
      aggregateType: "order",
      aggregateId: order.id,
      payload: { orderNumber: order.orderNumber, totalMinor },
    });
    await this.carts.clear(cart.id);
    return this.orderDetail(order);
  }

  @Transaction({ retries: 2 })
  async approve(id: string, actorUserId: string) {
    const order = await this.lockOrder(id);
    this.validator.ensureStatus(order, "pending");
    const items = await this.orders.listItems(order.id);
    await this.allocateInventory(order, items);
    await this.captureBudget(order, actorUserId);
    const approved = await this.orders.update(order.id, {
      status: "approved",
      approvedByUserId: actorUserId,
      approvedAt: new Date(),
    });
    await this.recordTransition(order, approved, actorUserId, null, "approved");
    return this.orderDetail(approved);
  }

  @Transaction({ retries: 2 })
  async reject(id: string, data: OrderReasonDto, actorUserId: string) {
    const { reason } = orderReasonDto.parse(data);
    const order = await this.lockOrder(id);
    this.validator.ensureStatus(order, "pending");
    await this.releaseInventory(order, await this.orders.listItems(order.id));
    await this.releaseBudget(order, actorUserId, reason);
    const rejected = await this.orders.update(order.id, {
      status: "rejected",
      rejectedByUserId: actorUserId,
      rejectedAt: new Date(),
      rejectionReason: reason,
    });
    await this.recordTransition(order, rejected, actorUserId, reason, "rejected");
    return this.orderDetail(rejected);
  }

  @Transaction({ retries: 2 })
  async startPreparation(id: string, actorUserId: string) {
    const order = await this.lockOrder(id);
    this.validator.ensureStatus(order, "approved");
    const prepared = await this.orders.update(order.id, {
      status: "in_preparation",
      preparationStartedAt: new Date(),
    });
    await this.recordTransition(order, prepared, actorUserId, null, "preparationStarted");
    return this.orderDetail(prepared);
  }

  @Transaction({ retries: 2 })
  async deliver(id: string, actorUserId: string) {
    const order = await this.lockOrder(id);
    this.validator.ensureStatus(order, "in_preparation");
    const delivered = await this.orders.update(order.id, {
      status: "delivered",
      deliveredAt: new Date(),
    });
    await this.recordTransition(order, delivered, actorUserId, null, "delivered");
    return this.orderDetail(delivered);
  }

  @Transaction({ retries: 2 })
  async cancelOwn(id: string, data: FamilyCancelOrderDto, userId: string) {
    const { reason } = familyCancelOrderDto.parse(data);
    const family = await this.validator.ensureFamily(userId);
    const order = await this.lockOrder(id);
    this.validator.ensureLockedOrderOwnedBy(order, family.id);
    if (order.status === "cancelled") {
      return this.orderDetail(order);
    }
    this.validator.ensureStatus(order, "pending");
    return this.cancelPendingOrder(order, userId, reason ?? null);
  }

  @Transaction({ retries: 2 })
  async cancel(id: string, data: OrderReasonDto, actorUserId: string) {
    const { reason } = orderReasonDto.parse(data);
    const order = await this.lockOrder(id);
    if (order.status === "cancelled") {
      return this.orderDetail(order);
    }
    this.validator.ensureOneOfStatuses(order, [
      "pending",
      "approved",
      "in_preparation",
    ]);
    if (order.status === "pending") {
      return this.cancelPendingOrder(order, actorUserId, reason);
    }
    await this.returnInventory(order, await this.orders.listItems(order.id));
    await this.refundBudget(order, actorUserId, reason);
    const cancelled = await this.orders.update(order.id, {
      status: "cancelled",
      cancelledByUserId: actorUserId,
      cancelledAt: new Date(),
      cancellationReason: reason,
    });
    await this.recordTransition(order, cancelled, actorUserId, reason, "cancelled");
    return this.orderDetail(cancelled);
  }

  private async cancelPendingOrder(
    order: Order,
    actorUserId: string,
    reason: string | null,
  ) {
    await this.releaseInventory(order, await this.orders.listItems(order.id));
    await this.releaseBudget(order, actorUserId, reason);
    const cancelled = await this.orders.update(order.id, {
      status: "cancelled",
      cancelledByUserId: actorUserId,
      cancelledAt: new Date(),
      cancellationReason: reason,
    });
    await this.recordTransition(order, cancelled, actorUserId, reason, "cancelled");
    return this.orderDetail(cancelled);
  }

  private async reserveBudget(order: Order, actorUserId: string) {
    const account = await this.accounts.lockByFamilyId(order.familyProfileId);
    if (!account) {
      HttpError.notFound("Budget account not found");
    }
    if (account.availableMinor < order.totalMinor) {
      HttpError.conflict("Order total exceeds the available budget");
    }
    const month = currentMonth();
    const limit = await this.limits.findByAccountAndMonth(account.id, month);
    if (limit) {
      const used = await this.ledger.monthlyOrderUsage(account.id, month);
      if (order.totalMinor > limit.limitMinor - used) {
        HttpError.conflict("Order total exceeds the remaining monthly limit");
      }
    }
    const balance = applyBudgetBalanceDelta(account, {
      availableMinor: -order.totalMinor,
      reservedMinor: order.totalMinor,
    });
    const updated = await this.accounts.updateBalances(account.id, balance);
    if (!updated) {
      HttpError.notFound("Budget account not found");
    }
    await this.ledger.append({
      budgetAccountId: account.id,
      entryType: "order_reserve",
      amountMinor: -order.totalMinor,
      availableAfterMinor: updated.availableMinor,
      reservedAfterMinor: updated.reservedMinor,
      spentAfterMinor: updated.spentMinor,
      sourceType: "order",
      sourceId: order.id,
      idempotencyKey: `order:${order.id}:budget:reserve`,
      actorUserId,
      reason: null,
    });
  }

  private async captureBudget(order: Order, actorUserId: string) {
    const account = await this.accounts.lockByFamilyId(order.familyProfileId);
    if (!account) {
      HttpError.notFound("Budget account not found");
    }
    const reserve = await this.ledger.findByIdempotencyKey(
      `order:${order.id}:budget:reserve`,
    );
    if (!reserve) {
      HttpError.conflict("Order budget reservation is missing");
    }
    const balance = applyBudgetBalanceDelta(account, {
      reservedMinor: -order.totalMinor,
      spentMinor: order.totalMinor,
    });
    const updated = await this.accounts.updateBalances(account.id, balance);
    if (!updated) {
      HttpError.notFound("Budget account not found");
    }
    await this.ledger.append({
      budgetAccountId: account.id,
      entryType: "order_capture",
      amountMinor: -order.totalMinor,
      availableAfterMinor: updated.availableMinor,
      reservedAfterMinor: updated.reservedMinor,
      spentAfterMinor: updated.spentMinor,
      sourceType: "order",
      sourceId: order.id,
      idempotencyKey: `order:${order.id}:budget:capture`,
      actorUserId,
      reason: null,
      reversesEntryId: reserve.id,
    });
  }

  private async releaseBudget(
    order: Order,
    actorUserId: string,
    reason: string | null,
  ) {
    const account = await this.accounts.lockByFamilyId(order.familyProfileId);
    if (!account) {
      HttpError.notFound("Budget account not found");
    }
    const reserve = await this.ledger.findByIdempotencyKey(
      `order:${order.id}:budget:reserve`,
    );
    if (!reserve) {
      HttpError.conflict("Order budget reservation is missing");
    }
    const balance = applyBudgetBalanceDelta(account, {
      availableMinor: order.totalMinor,
      reservedMinor: -order.totalMinor,
    });
    const updated = await this.accounts.updateBalances(account.id, balance);
    if (!updated) {
      HttpError.notFound("Budget account not found");
    }
    await this.ledger.append({
      budgetAccountId: account.id,
      entryType: "order_release",
      amountMinor: order.totalMinor,
      availableAfterMinor: updated.availableMinor,
      reservedAfterMinor: updated.reservedMinor,
      spentAfterMinor: updated.spentMinor,
      sourceType: "order",
      sourceId: order.id,
      idempotencyKey: `order:${order.id}:budget:release`,
      actorUserId,
      reason,
      reversesEntryId: reserve.id,
    });
  }

  private async refundBudget(
    order: Order,
    actorUserId: string,
    reason: string,
  ) {
    const account = await this.accounts.lockByFamilyId(order.familyProfileId);
    if (!account) {
      HttpError.notFound("Budget account not found");
    }
    const capture = await this.ledger.findByIdempotencyKey(
      `order:${order.id}:budget:capture`,
    );
    if (!capture) {
      HttpError.conflict("Order budget capture is missing");
    }
    const balance = applyBudgetBalanceDelta(account, {
      availableMinor: order.totalMinor,
      spentMinor: -order.totalMinor,
    });
    const updated = await this.accounts.updateBalances(account.id, balance);
    if (!updated) {
      HttpError.notFound("Budget account not found");
    }
    await this.ledger.append({
      budgetAccountId: account.id,
      entryType: "order_refund",
      amountMinor: order.totalMinor,
      availableAfterMinor: updated.availableMinor,
      reservedAfterMinor: updated.reservedMinor,
      spentAfterMinor: updated.spentMinor,
      sourceType: "order",
      sourceId: order.id,
      idempotencyKey: `order:${order.id}:budget:refund`,
      actorUserId,
      reason,
      reversesEntryId: capture.id,
    });
  }

  private async allocateInventory(
    order: Order,
    items: Awaited<ReturnType<OrderRepository["listItems"]>>,
  ) {
    for (const item of [...items].sort((left, right) =>
      left.productId.localeCompare(right.productId),
    )) {
      await this.catalog.allocate({
        productId: item.productId,
        quantity: item.quantity,
        sourceId: order.id,
        idempotencyKey: `order:${order.id}:inventory:allocate:${item.productId}`,
      });
    }
  }

  private async releaseInventory(
    order: Order,
    items: Awaited<ReturnType<OrderRepository["listItems"]>>,
  ) {
    for (const item of [...items].sort((left, right) =>
      left.productId.localeCompare(right.productId),
    )) {
      await this.catalog.release({
        productId: item.productId,
        quantity: item.quantity,
        sourceId: order.id,
        idempotencyKey: `order:${order.id}:inventory:release:${item.productId}`,
      });
    }
  }

  private async returnInventory(
    order: Order,
    items: Awaited<ReturnType<OrderRepository["listItems"]>>,
  ) {
    for (const item of [...items].sort((left, right) =>
      left.productId.localeCompare(right.productId),
    )) {
      await this.catalog.returnAllocated({
        productId: item.productId,
        quantity: item.quantity,
        sourceId: order.id,
        idempotencyKey: `order:${order.id}:inventory:return:${item.productId}`,
      });
    }
  }

  private async recordTransition(
    before: Order,
    after: Order,
    actorUserId: string,
    reason: string | null,
    action: string,
  ) {
    await this.orders.appendStatusEvent({
      orderId: after.id,
      fromStatus: before.status,
      toStatus: after.status,
      actorUserId,
      reason,
    });
    await this.audits.record({
      action: `order.${action}`,
      actorUserId,
      metadata: { fromStatus: before.status, toStatus: after.status },
      resource: "orders",
      resourceId: after.id,
    });
    await this.outbox.enqueue({
      topic: `order.${after.status}`,
      aggregateType: "order",
      aggregateId: after.id,
      payload: { orderNumber: after.orderNumber, totalMinor: after.totalMinor },
    });
  }

  private async lockOrder(id: string) {
    const order = await this.orders.lockById(id);
    if (!order) {
      HttpError.notFound("Order not found");
    }
    return order;
  }

  private async getOrCreateCart(familyProfileId: string) {
    const cart = await this.carts.findByFamilyId(familyProfileId);
    const created = cart ?? (await this.carts.createForFamily(familyProfileId));
    if (!created) {
      HttpError.notFound("Cart could not be created");
    }
    return created;
  }

  private async lockCart(familyProfileId: string) {
    await this.getOrCreateCart(familyProfileId);
    const cart = await this.carts.lockByFamilyId(familyProfileId);
    if (!cart) {
      HttpError.notFound("Cart not found");
    }
    return cart;
  }

  private async ensureActiveProduct(productId: string) {
    const product = await this.products.findActiveById(productId);
    if (!product) {
      HttpError.notFound("Active product not found");
    }
    return product;
  }

  private async orderDetail(order: Order) {
    const [items, statusEvents] = await Promise.all([
      this.orders.listItems(order.id),
      this.orders.listStatusEvents(order.id),
    ]);
    return { ...order, items, statusEvents };
  }

  private cartProjection(
    cart: { id: string; familyProfileId: string; createdAt: Date; updatedAt: Date },
    items: Awaited<ReturnType<CartRepository["listItems"]>>,
  ) {
    const projectedItems = items.map((item) => ({
      id: item.id,
      productId: item.productId,
      productName: item.productName,
      sku: item.sku,
      quantity: item.quantity,
      unitPriceMinor: item.priceMinor,
      lineTotalMinor: multiplyMinor(item.priceMinor, item.quantity),
      currency: item.currency,
      available: item.productStatus === "active" && item.categoryStatus === "active",
    }));
    const totalMinor = sumMinor(projectedItems.map((item) => item.lineTotalMinor));
    return {
      id: cart.id,
      familyProfileId: cart.familyProfileId,
      createdAt: cart.createdAt,
      updatedAt: cart.updatedAt,
      items: projectedItems,
      subtotalMinor: totalMinor,
      totalMinor,
      currency: "MAD" as const,
    };
  }
}

function multiplyMinor(unitPriceMinor: number, quantity: number) {
  const total = unitPriceMinor * quantity;
  if (!Number.isSafeInteger(total) || total <= 0) {
    HttpError.conflict("Cart total is outside the supported money range");
  }
  return total;
}

function sumMinor(amounts: number[]) {
  const total = amounts.reduce((sum, amount) => sum + amount, 0);
  if (!Number.isSafeInteger(total) || total < 0) {
    HttpError.conflict("Cart total is outside the supported money range");
  }
  return total;
}

function currentMonth() {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

function orderNumber() {
  return `KAF-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${crypto
    .randomUUID()
    .slice(0, 8)
    .toUpperCase()}`;
}
