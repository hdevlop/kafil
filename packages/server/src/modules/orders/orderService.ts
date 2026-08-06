import { nanoid } from "nanoid";
import { HttpError, Service } from "najm-core";
import { Transaction } from "najm-database";

import { listPage } from "../../pagination";
import { AuditService } from "../audit/auditService";
import {
  BudgetAccountRepository,
  BudgetLedgerRepository,
  MonthlyBudgetLimitRepository,
} from "../budgets/budgetRepository";
import { applyBudgetBalanceDelta } from "../budgets/money";
import { ProductRepository } from "../catalog";
import { OutboxService } from "../outbox/outboxService";
import { FundingService } from "../settings/fundingService";
import {
  StaffRepository,
  type StaffRecord,
} from "../staff/staffRepository";
import {
  assignDeliveryDto,
  type AssignDeliveryDto,
  assistedOrderDto,
  type AssistedOrderDto,
  type CartItemDto,
  cartItemDto,
  confirmDeliveryDto,
  type ConfirmDeliveryDto,
  failDeliveryDto,
  type FailDeliveryDto,
  type FamilyCancelOrderDto,
  familyCancelOrderDto,
  type OperatorCancelOrderDto,
  operatorCancelOrderDto,
  type OrderListQuery,
  orderListQuery,
  type OrderReasonDto,
  orderReasonDto,
  type OwnOrderListQuery,
  ownOrderListQuery,
  recordPurchaseDto,
  type RecordPurchaseDto,
  replacePurchaseDto,
  type ReplacePurchaseDto,
  reassignDeliveryDto,
  type ReassignDeliveryDto,
  type SetCartItemQuantityDto,
  setCartItemQuantityDto,
  type SubmitOrderDto,
  submitOrderDto,
  startDeliveryDto,
  type StartDeliveryDto,
} from "./orderDto";
import { OrderEvidenceService } from "./orderEvidenceService";
import {
  CartRepository,
  OrderDeliveryRepository,
  OrderPurchaseRepository,
  OrderRepository,
} from "./orderRepository";
import type {
  Order,
  OrderDeliveryAttempt,
  OrderPurchaseRecord,
} from "./orderSchema";
import { OrderValidator } from "./orderValidator";

interface FamilyOrderContext {
  id: string;
  userId: string;
  guardianLegalName: string;
  exactAddress: string;
  phone: string | null;
}

interface PendingOrderInput {
  family: FamilyOrderContext;
  items: Array<{ productId: string; quantity: number }>;
  placementSource: Order["placementSource"];
  placedByUserId: string;
  assistanceChannel: Order["assistanceChannel"];
  assistanceNote: string | null;
  idempotencyKey: string;
  auditAction: "order.assisted_submitted" | "order.submitted";
  purchasingStaff: StaffRecord | null;
  deliveryStaff: StaffRecord | null;
}

@Service()
export class OrderService {
  constructor(
    private readonly carts: CartRepository,
    private readonly orders: OrderRepository,
    private readonly deliveries: OrderDeliveryRepository,
    private readonly purchases: OrderPurchaseRepository,
    private readonly staff: StaffRepository,
    private readonly products: ProductRepository,
    private readonly accounts: BudgetAccountRepository,
    private readonly ledger: BudgetLedgerRepository,
    private readonly limits: MonthlyBudgetLimitRepository,
    private readonly audits: AuditService,
    private readonly outbox: OutboxService,
    private readonly validator: OrderValidator,
    private readonly funding: FundingService,
    private readonly evidence: OrderEvidenceService,
  ) {}

  async getOwnCart(userId: string) {
    const family = await this.validator.ensureFamily(userId);
    const cart = await this.getOrCreateCart(family.id);
    return this.cartProjection(cart, await this.carts.listItems(cart.id));
  }

  async list(userQuery: OrderListQuery) {
    const { limit, offset, ...filters } = orderListQuery.parse(userQuery ?? {});
    const [records, total] = await Promise.all([
      this.orders.list(limit, offset, filters),
      this.orders.count(filters),
    ]);
    const latestByOrder = await this.deliveries.listLatestByOrderIds(
      records.map((order) => order.id),
    );
    return listPage(
      records.map((order) => {
        const latestDelivery = latestByOrder.get(order.id) ?? null;
        return {
          ...order,
          currentDelivery:
            latestDelivery &&
            ["assigned", "in_progress"].includes(latestDelivery.status)
              ? deliveryAttemptSummary(latestDelivery)
              : null,
          latestDelivery: latestDelivery
            ? deliveryAttemptSummary(latestDelivery)
            : null,
        };
      }),
      { limit, offset, total },
    );
  }

  async get(id: string) {
    const order = await this.validator.ensureOrderExists(id);
    return this.orderDetail(order, "operator");
  }

  async listForPrincipal(userId: string, role: string, query: OrderListQuery) {
    if (role === "family") {
      return this.listOwn(userId, query as OwnOrderListQuery);
    }
    if (role === "sponsor") {
      return this.listSupported(userId, query as OwnOrderListQuery);
    }
    return this.list(query);
  }

  async getForPrincipal(id: string, userId: string, role: string) {
    if (role === "family") {
      return this.getOwn(id, userId);
    }
    if (role === "sponsor") {
      return this.getSupported(id, userId);
    }
    return this.get(id);
  }

  async getSupported(id: string, userId: string) {
    const order = await this.orders.findSupportedBySponsor(id, userId);
    if (!order) {
      HttpError.notFound("Order not found");
    }
    return (await this.enrichSupportedOrders([order]))[0];
  }

  /** Bootstrap-admin correction for an order entered by mistake before any purchase. */
  @Transaction({ retries: 2 })
  async delete(id: string, actorUserId: string) {
    const order = await this.lockOrder(id);
    if (
      !["pending", "approved", "rejected", "cancelled"].includes(order.status) ||
      order.deliveryProofStoragePath
    ) {
      HttpError.conflict(
        "Only pre-purchase orders without fulfillment evidence can be permanently deleted",
      );
    }

    const purchaseHistory = await this.purchases.listByOrderId(order.id);
    if (purchaseHistory.length > 0) {
      HttpError.conflict(
        "Orders with purchase history cannot be permanently deleted",
      );
    }
    const deliveryHistory = await this.deliveries.listByOrderId(order.id);
    const hasDeliveryExecutionHistory = deliveryHistory.some(
      (attempt) =>
        attempt.startedAt !== null ||
        attempt.failedAt !== null ||
        attempt.completedAt !== null ||
        attempt.status === "in_progress" ||
        attempt.status === "failed" ||
        attempt.status === "delivered",
    );
    if (hasDeliveryExecutionHistory) {
      HttpError.conflict(
        "Orders with started delivery history cannot be permanently deleted",
      );
    }

    const account = await this.requireBudgetAccount(order.familyProfileId);
    const { balance, deletedCount } =
      await this.ledger.erasePrePurchaseOrderEntries({
        budgetAccountId: account.id,
        orderId: order.id,
      });
    await this.updateBudget(account.id, balance);

    const deleted = await this.orders.hardDelete(order.id);
    if (!deleted) {
      HttpError.notFound("Order not found");
    }
    await this.audits.record({
      action: "order.deleted",
      actorUserId,
      metadata: {
        permanent: true,
        previousStatus: order.status,
        ledgerEntriesRemoved: deletedCount,
      },
      resource: "orders",
      resourceId: order.id,
    });
    return deleted;
  }

  async listOwn(userId: string, userQuery: OwnOrderListQuery) {
    const family = await this.validator.ensureFamily(userId);
    const { limit, offset, status, search } = ownOrderListQuery.parse(userQuery ?? {});
    const [records, total] = await Promise.all([
      this.orders.listByFamilyId(family.id, limit, offset, status, search),
      this.orders.countByFamilyId(family.id, status, search),
    ]);
    const latestByOrder = await this.deliveries.listLatestByOrderIds(
      records.map((order) => order.id),
    );
    const articleCountsByOrder = await this.orders.listArticleCountsByOrderIds(
      records.map((order) => order.id),
    );
    const rows = await Promise.all(
      records.map(async (order) => {
        const latestDelivery = latestByOrder.get(order.id) ?? null;
        return {
          ...(await this.familyOrderProjection(order)),
          deliveryAssigned: ["assigned", "in_progress"].includes(
            latestDelivery?.status ?? "",
          ),
          deliveryName: latestDelivery?.deliveryNameSnapshot ?? null,
          articleCount: articleCountsByOrder.get(order.id) ?? 0,
          canCancelOwn: order.status === "pending",
        };
      }),
    );
    return listPage(rows, { limit, offset, total });
  }

  async getOwn(id: string, userId: string) {
    const { order } = await this.validator.ensureOrderOwnedByFamily(id, userId);
    return this.orderDetail(order, "family");
  }

  async listSupported(userId: string, userQuery: OwnOrderListQuery) {
    const { limit, offset, status, search } = ownOrderListQuery.parse(userQuery ?? {});
    const [summaries, total] = await Promise.all([
      this.orders.listSupportedBySponsor(userId, limit, offset, status, search),
      this.orders.countSupportedBySponsor(userId, status, search),
    ]);
    return listPage(await this.enrichSupportedOrders(summaries), {
      limit,
      offset,
      total,
    });
  }

  private async enrichSupportedOrders(
    summaries: Awaited<ReturnType<OrderRepository["listSupportedBySponsor"]>>,
  ) {
    const orderIds = summaries.map((order) => order.id);
    const [latestByOrder, purchasesByOrder, itemsByOrder] = await Promise.all([
      this.deliveries.listLatestByOrderIds(orderIds),
      this.purchases.listActiveByOrderIds(orderIds),
      this.orders.listItemsByOrderIds(orderIds),
    ]);
    return summaries.map((order) => {
        const purchase = purchasesByOrder.get(order.id) ?? null;
        const latestDelivery = latestByOrder.get(order.id) ?? null;
        return {
          ...order,
          deliveryName: latestDelivery?.deliveryNameSnapshot ?? null,
          deliveryStatus: latestDelivery?.status ?? null,
          actualTotalMinor: purchase?.actualTotalMinor ?? null,
          merchantName: purchase?.merchantName ?? null,
          purchasedAt: purchase?.purchasedAt ?? null,
          receiptRecorded: Boolean(purchase),
          deliveryProofRecorded: order.deliveryProofRecorded,
          items: (itemsByOrder.get(order.id) ?? []).map((item) => ({
            productName: item.productNameSnapshot,
            sku: item.skuSnapshot,
            quantity: item.quantity,
            unitPriceMinor: item.unitPriceMinor,
            lineTotalMinor: item.lineTotalMinor,
          })),
        };
      });
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
      this.validator.ensureIdempotencyContext(existing, {
        familyProfileId: family.id,
        placementSource: "family_self_service",
        placedByUserId: userId,
      });
      return this.orderDetail(existing, "family");
    }

    const cart = await this.lockCart(family.id);
    const repeated = await this.orders.findByIdempotencyKey(input.idempotencyKey);
    if (repeated) {
      this.validator.ensureIdempotencyContext(repeated, {
        familyProfileId: family.id,
        placementSource: "family_self_service",
        placedByUserId: userId,
      });
      return this.orderDetail(repeated, "family");
    }
    const cartItems = await this.carts.listItems(cart.id);
    if (!cartItems.length) {
      HttpError.conflict("Cannot submit an empty cart");
    }

    const order = await this.createPendingOrder({
      family,
      items: cartItems.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
      })),
      placementSource: "family_self_service",
      placedByUserId: userId,
      assistanceChannel: null,
      assistanceNote: null,
      idempotencyKey: input.idempotencyKey,
      auditAction: "order.submitted",
      purchasingStaff: null,
      deliveryStaff: null,
    });
    await this.carts.clear(cart.id);
    return this.orderDetail(order, "family");
  }

  @Transaction({ retries: 2 })
  async submitAssisted(data: AssistedOrderDto, actorUserId: string) {
    const input = assistedOrderDto.parse(data);
    const family = await this.validator.ensureActiveFamilyById(
      input.familyProfileId,
    );
    await this.funding.ensureOrderEligible(family.id);
    const existing = await this.orders.findByIdempotencyKey(input.idempotencyKey);
    if (existing) {
      this.validator.ensureIdempotencyContext(existing, {
        familyProfileId: family.id,
        placementSource: "operator_assisted",
        placedByUserId: actorUserId,
      });
      await this.ensurePendingAssignmentIdempotencyContext(existing, {
        purchasingStaffProfileId: input.purchasingStaffProfileId,
        deliveryStaffProfileId: input.deliveryStaffProfileId,
      });
      return this.orderDetail(existing, "operator");
    }

    const purchasingStaff = input.purchasingStaffProfileId
      ? await this.ensureAssignablePurchasingStaff(
          input.purchasingStaffProfileId,
        )
      : null;
    const deliveryStaff = input.deliveryStaffProfileId
      ? await this.ensureAssignableDeliveryStaff(input.deliveryStaffProfileId)
      : null;

    const order = await this.createPendingOrder({
      family,
      items: input.items,
      placementSource: "operator_assisted",
      placedByUserId: actorUserId,
      assistanceChannel: input.assistanceChannel,
      assistanceNote: input.assistanceNote ?? null,
      idempotencyKey: input.idempotencyKey,
      auditAction: "order.assisted_submitted",
      purchasingStaff,
      deliveryStaff,
    });
    return this.orderDetail(order, "operator");
  }

  @Transaction({ retries: 2 })
  async approve(id: string, actorUserId: string) {
    const order = await this.lockOrder(id);
    this.validator.ensureStatus(order, "pending");
    const approved = await this.orders.update(order.id, {
      status: "approved",
      approvedByUserId: actorUserId,
      approvedAt: new Date(),
    });
    await this.recordTransition(order, approved, actorUserId, null, "approved");
    return this.orderDetail(approved, "operator");
  }

  @Transaction({ retries: 2 })
  async reject(id: string, data: OrderReasonDto, actorUserId: string) {
    const { reason } = orderReasonDto.parse(data);
    const order = await this.lockOrder(id);
    this.validator.ensureStatus(order, "pending");
    await this.releaseRequestedReservation(order, actorUserId, reason);
    const activeDelivery = await this.deliveries.findActiveByOrderId(
      order.id,
      true,
    );
    if (activeDelivery) {
      await this.deliveries.cancel(activeDelivery.id, reason, new Date());
    }
    const rejected = await this.orders.update(order.id, {
      status: "rejected",
      rejectedByUserId: actorUserId,
      rejectedAt: new Date(),
      rejectionReason: reason,
    });
    await this.recordTransition(order, rejected, actorUserId, reason, "rejected");
    return this.orderDetail(rejected, "operator");
  }

  @Transaction({ retries: 2 })
  async recordPurchase(id: string, data: RecordPurchaseDto, actorUserId: string) {
    const input = recordPurchaseDto.parse(data);
    const existing = await this.purchases.findByIdempotencyKey(
      input.idempotencyKey,
    );
    if (existing) {
      if (existing.orderId !== id) {
        HttpError.conflict("Purchase idempotency key was already used");
      }
      return this.get(id);
    }

    const order = await this.lockOrder(id);
    this.validator.ensureStatus(order, "approved");
    if (await this.purchases.findActiveByOrderId(order.id)) {
      HttpError.conflict("Order already has an active purchase");
    }
    await this.evidence.ensureManagedReference(
      "receipts",
      input.receiptStoragePath,
      input.receiptMediaType,
      input.receiptByteSize,
    );

    const purchaseId = crypto.randomUUID();
    await this.settleInitialPurchase(
      order,
      purchaseId,
      input.actualTotalMinor,
      input.confirmHigherAmount,
      actorUserId,
    );
    const purchase = await this.purchases.create({
      id: purchaseId,
      orderId: order.id,
      merchantName: input.merchantName,
      receiptNumber: input.receiptNumber ?? null,
      purchasedAt: input.purchasedAt,
      actualTotalMinor: input.actualTotalMinor,
      currency: "MAD",
      receiptStoragePath: input.receiptStoragePath,
      receiptMediaType: input.receiptMediaType,
      receiptByteSize: input.receiptByteSize,
      recordedByUserId: actorUserId,
      idempotencyKey: input.idempotencyKey,
      replacesPurchaseId: null,
    });
    const purchased = await this.orders.update(order.id, {
      status: "purchased",
    });
    await this.recordTransition(
      order,
      purchased,
      actorUserId,
      null,
      "purchase_recorded",
      purchaseMetadata(order, purchase),
    );
    return this.orderDetail(purchased, "operator");
  }

  @Transaction({ retries: 2 })
  async replacePurchase(
    id: string,
    data: ReplacePurchaseDto,
    actorUserId: string,
  ) {
    const input = replacePurchaseDto.parse(data);
    const repeated = await this.purchases.findByIdempotencyKey(
      input.idempotencyKey,
    );
    if (repeated) {
      if (repeated.orderId !== id) {
        HttpError.conflict("Purchase idempotency key was already used");
      }
      return this.get(id);
    }

    const order = await this.lockOrder(id);
    this.validator.ensureStatus(order, "purchased");
    const current = await this.purchases.findActiveByOrderId(order.id);
    if (!current) {
      HttpError.conflict("Active purchase record is missing");
    }
    await this.evidence.ensureManagedReference(
      "receipts",
      input.receiptStoragePath,
      input.receiptMediaType,
      input.receiptByteSize,
    );

    const replacementId = crypto.randomUUID();
    await this.settleReplacementDifference(
      order,
      current,
      replacementId,
      input.actualTotalMinor,
      input.confirmHigherAmount,
      actorUserId,
      input.reason,
    );
    await this.purchases.reverse({
      purchaseId: current.id,
      reason: input.reason,
      reversedByUserId: actorUserId,
      idempotencyKey: `${input.idempotencyKey}:reversal`,
    });
    const replacement = await this.purchases.create({
      id: replacementId,
      orderId: order.id,
      merchantName: input.merchantName,
      receiptNumber: input.receiptNumber ?? null,
      purchasedAt: input.purchasedAt,
      actualTotalMinor: input.actualTotalMinor,
      currency: "MAD",
      receiptStoragePath: input.receiptStoragePath,
      receiptMediaType: input.receiptMediaType,
      receiptByteSize: input.receiptByteSize,
      recordedByUserId: actorUserId,
      idempotencyKey: input.idempotencyKey,
      replacesPurchaseId: current.id,
    });
    await this.audits.record({
      action: "order.purchase_replaced",
      actorUserId,
      metadata: {
        previousActualTotalMinor: current.actualTotalMinor,
        actualTotalMinor: replacement.actualTotalMinor,
        differenceMinor:
          replacement.actualTotalMinor - current.actualTotalMinor,
        evidenceRecorded: true,
      },
      resource: "orders",
      resourceId: order.id,
    });
    await this.outbox.enqueue({
      topic: "order.purchase_replaced",
      aggregateType: "order",
      aggregateId: order.id,
      payload: {
        orderNumber: order.orderNumber,
        actualTotalMinor: replacement.actualTotalMinor,
      },
    });
    return this.orderDetail(order, "operator");
  }

  @Transaction({ retries: 2 })
  async assignDelivery(
    id: string,
    data: AssignDeliveryDto,
    actorUserId: string,
  ) {
    const input = assignDeliveryDto.parse(data);
    const order = await this.lockOrder(id);
    const repeated = await this.deliveries.findByAssignmentIdempotencyKey(
      input.idempotencyKey,
    );
    if (repeated) {
      this.ensureDeliveryIdempotencyContext(repeated, order.id, input.staffProfileId);
      return this.orderDetail(order, "operator");
    }
    this.validator.ensureOneOfStatuses(order, ["pending", "approved", "purchased"]);
    if (await this.deliveries.findActiveByOrderId(order.id, true)) {
      HttpError.conflict("Order already has an active delivery assignment");
    }
    const staff = await this.ensureAssignableDeliveryStaff(input.staffProfileId);
    const attempt = await this.deliveries.create({
      orderId: order.id,
      staffProfileId: staff.id,
      status: "assigned",
      deliveryNameSnapshot: staff.name,
      deliveryPhoneSnapshot: staff.phone,
      affiliationSnapshot: staff.affiliation,
      companyNameSnapshot: staff.companyName,
      assignedByUserId: actorUserId,
      assignmentIdempotencyKey: input.idempotencyKey,
    });
    await this.recordDeliveryEvent("assigned", order, attempt, actorUserId);
    return this.orderDetail(order, "operator");
  }

  @Transaction({ retries: 2 })
  async reassignDelivery(
    id: string,
    data: ReassignDeliveryDto,
    actorUserId: string,
  ) {
    const input = reassignDeliveryDto.parse(data);
    const order = await this.lockOrder(id);
    const repeated = await this.deliveries.findByAssignmentIdempotencyKey(
      input.idempotencyKey,
    );
    if (repeated) {
      this.ensureDeliveryIdempotencyContext(repeated, order.id, input.staffProfileId);
      return this.orderDetail(order, "operator");
    }
    this.validator.ensureOneOfStatuses(order, ["pending", "approved", "purchased"]);
    const current = await this.deliveries.findActiveByOrderId(order.id, true);
    if (!current || current.status !== "assigned") {
      HttpError.conflict("An assigned delivery attempt is required");
    }
    if (current.staffProfileId === input.staffProfileId) {
      HttpError.conflict("Choose a different delivery staff member");
    }
    const staff = await this.ensureAssignableDeliveryStaff(input.staffProfileId);
    const changedAt = new Date();
    await this.deliveries.cancel(current.id, input.reason, changedAt);
    const replacement = await this.deliveries.create({
      orderId: order.id,
      staffProfileId: staff.id,
      status: "assigned",
      deliveryNameSnapshot: staff.name,
      deliveryPhoneSnapshot: staff.phone,
      affiliationSnapshot: staff.affiliation,
      companyNameSnapshot: staff.companyName,
      assignedByUserId: actorUserId,
      assignedAt: changedAt,
      assignmentIdempotencyKey: input.idempotencyKey,
    });
    await this.recordDeliveryEvent("reassigned", order, replacement, actorUserId, {
      previousAttemptId: current.id,
      previousStaffProfileId: current.staffProfileId,
    });
    return this.orderDetail(order, "operator");
  }

  @Transaction({ retries: 2 })
  async startDelivery(
    id: string,
    data: StartDeliveryDto,
    actorUserId: string,
  ) {
    const input = startDeliveryDto.parse(data);
    const order = await this.lockOrder(id);
    const repeated = await this.deliveries.findByStartIdempotencyKey(
      input.idempotencyKey,
    );
    if (repeated) {
      this.ensureDeliveryIdempotencyContext(repeated, order.id);
      return this.orderDetail(order, "operator");
    }
    this.validator.ensureStatus(order, "purchased");
    if (!(await this.purchases.findActiveByOrderId(order.id))) {
      HttpError.conflict("Active purchase record is required");
    }
    const attempt = await this.deliveries.findActiveByOrderId(order.id, true);
    if (!attempt || attempt.status !== "assigned") {
      HttpError.conflict("An active delivery assignment is required");
    }
    await this.ensureAssignableDeliveryStaff(attempt.staffProfileId);
    const startedAt = new Date();
    await this.deliveries.start(attempt.id, input.idempotencyKey, startedAt);
    const started = await this.orders.update(order.id, {
      status: "out_for_delivery",
      deliveryStartedAt: startedAt,
      deliveryStartedByUserId: actorUserId,
    });
    await this.recordTransition(
      order,
      started,
      actorUserId,
      null,
      "delivery_started",
      { attemptId: attempt.id, staffProfileId: attempt.staffProfileId },
    );
    return this.orderDetail(started, "operator");
  }

  @Transaction({ retries: 2 })
  async failDelivery(
    id: string,
    data: FailDeliveryDto,
    actorUserId: string,
  ) {
    const input = failDeliveryDto.parse(data);
    const order = await this.lockOrder(id);
    const repeated = await this.deliveries.findByFailIdempotencyKey(
      input.idempotencyKey,
    );
    if (repeated) {
      this.ensureDeliveryIdempotencyContext(repeated, order.id);
      return this.orderDetail(order, "operator");
    }
    this.validator.ensureStatus(order, "out_for_delivery");
    const attempt = await this.deliveries.findActiveByOrderId(order.id, true);
    if (!attempt || attempt.status !== "in_progress") {
      HttpError.conflict("An in-progress delivery attempt is required");
    }
    const failedAt = new Date();
    await this.deliveries.fail(
      attempt.id,
      input.reason,
      input.idempotencyKey,
      failedAt,
    );
    const returned = await this.orders.update(order.id, {
      status: "purchased",
      deliveryStartedAt: null,
      deliveryStartedByUserId: null,
    });
    await this.recordTransition(
      order,
      returned,
      actorUserId,
      null,
      "delivery_failed",
      { attemptId: attempt.id, staffProfileId: attempt.staffProfileId },
    );
    return this.orderDetail(returned, "operator");
  }

  @Transaction({ retries: 2 })
  async confirmDelivery(
    id: string,
    data: ConfirmDeliveryDto,
    actorUserId: string,
  ) {
    const input = confirmDeliveryDto.parse(data);
    const order = await this.lockOrder(id);
    if (order.status === "delivered") {
      if (order.deliveryConfirmationIdempotencyKey === input.idempotencyKey) {
        return this.orderDetail(order, "operator");
      }
      HttpError.conflict("Order is already delivered");
    }
    const repeatedAttempt =
      await this.deliveries.findByConfirmationIdempotencyKey(
        input.idempotencyKey,
      );
    if (repeatedAttempt) {
      this.ensureDeliveryIdempotencyContext(repeatedAttempt, order.id);
      return this.orderDetail(order, "operator");
    }
    this.validator.ensureStatus(order, "out_for_delivery");
    const attempt = await this.deliveries.findActiveByOrderId(order.id, true);
    if (!attempt || attempt.status !== "in_progress") {
      HttpError.conflict("An in-progress delivery attempt is required");
    }
    if (input.proofStoragePath) {
      await this.evidence.ensureManagedReference(
        "deliveries",
        input.proofStoragePath,
        input.proofMediaType!,
        input.proofByteSize!,
      );
    }
    const deliveredAt = new Date();
    await this.deliveries.complete(
      attempt.id,
      input.idempotencyKey,
      deliveredAt,
    );
    const delivered = await this.orders.update(order.id, {
      status: "delivered",
      deliveredAt,
      deliveredByUserId: actorUserId,
      deliveryConfirmationMethod: input.confirmationMethod,
      deliveryNote: input.deliveryNote ?? null,
      deliveryProofStoragePath: input.proofStoragePath ?? null,
      deliveryProofMediaType: input.proofMediaType ?? null,
      deliveryProofByteSize: input.proofByteSize ?? null,
      deliveryConfirmationIdempotencyKey: input.idempotencyKey,
    });
    await this.recordTransition(
      order,
      delivered,
      actorUserId,
      null,
      "delivered",
      {
        attemptId: attempt.id,
        staffProfileId: attempt.staffProfileId,
        evidenceRecorded: Boolean(input.proofStoragePath),
      },
    );
    return this.orderDetail(delivered, "operator");
  }

  /** Historical compatibility for orders already in the retired state. */
  @Transaction({ retries: 2 })
  async deliverLegacy(id: string, actorUserId: string) {
    const order = await this.lockOrder(id);
    this.validator.ensureStatus(order, "in_preparation");
    const delivered = await this.orders.update(order.id, {
      status: "delivered",
      deliveredAt: new Date(),
      deliveredByUserId: actorUserId,
      deliveryConfirmationMethod: "operator_confirmation",
    });
    await this.recordTransition(
      order,
      delivered,
      actorUserId,
      null,
      "delivered",
      { legacy: true },
    );
    return this.orderDetail(delivered, "operator");
  }

  @Transaction({ retries: 2 })
  async cancelOwn(id: string, data: FamilyCancelOrderDto, userId: string) {
    const { reason } = familyCancelOrderDto.parse(data);
    const family = await this.validator.ensureFamily(userId);
    const order = await this.lockOrder(id);
    this.validator.ensureLockedOrderOwnedBy(order, family.id);
    if (order.status === "cancelled") {
      return this.orderDetail(order, "family");
    }
    this.validator.ensureStatus(order, "pending");
    return this.cancelBeforePurchase(order, userId, reason ?? null, "family");
  }

  @Transaction({ retries: 2 })
  async cancel(id: string, data: OperatorCancelOrderDto, actorUserId: string) {
    const input = operatorCancelOrderDto.parse(data);
    const order = await this.lockOrder(id);
    if (order.status === "cancelled") {
      return this.orderDetail(order, "operator");
    }
    this.validator.ensureOneOfStatuses(order, [
      "pending",
      "approved",
      "in_preparation",
      "purchased",
      "out_for_delivery",
    ]);
    if (order.status === "pending" || order.status === "approved") {
      return this.cancelBeforePurchase(
        order,
        actorUserId,
        input.reason,
        "operator",
      );
    }
    if (order.status === "in_preparation") {
      await this.refundLegacyCapture(order, actorUserId, input.reason);
    } else {
      if (!input.confirmRecoverableGoods) {
        HttpError.conflict(
          "Post-purchase cancellation requires recoverable-goods confirmation",
        );
      }
      const purchase = await this.purchases.findActiveByOrderId(order.id);
      if (!purchase) {
        HttpError.conflict("Active purchase record is missing");
      }
      await this.refundPurchase(order, purchase, actorUserId, input.reason);
    }
    const activeDelivery = await this.deliveries.findActiveByOrderId(
      order.id,
      true,
    );
    if (activeDelivery) {
      await this.deliveries.cancel(
        activeDelivery.id,
        input.reason,
        new Date(),
      );
    }
    const cancelled = await this.orders.update(order.id, {
      status: "cancelled",
      cancelledByUserId: actorUserId,
      cancelledAt: new Date(),
      cancellationReason: input.reason,
    });
    await this.recordTransition(
      order,
      cancelled,
      actorUserId,
      input.reason,
      "cancelled",
    );
    return this.orderDetail(cancelled, "operator");
  }

  private async createPendingOrder(input: PendingOrderInput) {
    const existing = await this.orders.findByIdempotencyKey(
      input.idempotencyKey,
    );
    if (existing) {
      this.validator.ensureIdempotencyContext(existing, {
        familyProfileId: input.family.id,
        placementSource: input.placementSource,
        placedByUserId: input.placedByUserId,
      });
      await this.ensurePendingAssignmentIdempotencyContext(existing, {
        purchasingStaffProfileId: input.purchasingStaff?.id,
        deliveryStaffProfileId: input.deliveryStaff?.id,
      });
      return existing;
    }
    const valuedItems = await this.valueItems(input.items);
    const totalMinor = sumMinor(valuedItems.map((item) => item.lineTotalMinor));
    const order = await this.orders.create({
      orderNumber: orderNumber(),
      submissionIdempotencyKey: input.idempotencyKey,
      familyProfileId: input.family.id,
      placementSource: input.placementSource,
      assistanceChannel: input.assistanceChannel,
      assistanceNote: input.assistanceNote,
      status: "pending",
      subtotalMinor: totalMinor,
      totalMinor,
      currency: "MAD",
      guardianLegalNameSnapshot: input.family.guardianLegalName,
      deliveryAddressSnapshot: input.family.exactAddress,
      deliveryPhoneSnapshot: input.family.phone,
      placedByUserId: input.placedByUserId,
      purchasingStaffProfileId: input.purchasingStaff?.id ?? null,
      purchasingStaffNameSnapshot: input.purchasingStaff?.name ?? null,
      purchasingAssignedAt: input.purchasingStaff ? new Date() : null,
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
    let deliveryAttempt: OrderDeliveryAttempt | null = null;
    if (input.deliveryStaff) {
      deliveryAttempt = await this.deliveries.create({
        orderId: order.id,
        staffProfileId: input.deliveryStaff.id,
        status: "assigned",
        deliveryNameSnapshot: input.deliveryStaff.name,
        deliveryPhoneSnapshot: input.deliveryStaff.phone,
        affiliationSnapshot: input.deliveryStaff.affiliation,
        companyNameSnapshot: input.deliveryStaff.companyName,
        assignedByUserId: input.placedByUserId,
        assignmentIdempotencyKey: input.idempotencyKey,
      });
    }
    await this.reserveRequestedBudget(order, input.placedByUserId);
    await this.orders.appendStatusEvent({
      orderId: order.id,
      fromStatus: null,
      toStatus: "pending",
      actorUserId: input.placedByUserId,
      reason: null,
    });
    await this.audits.record({
      action: input.auditAction,
      actorUserId: input.placedByUserId,
      metadata: {
        placementSource: input.placementSource,
        ...(input.assistanceChannel
          ? { assistanceChannel: input.assistanceChannel }
          : {}),
        totalMinor,
        itemCount: valuedItems.length,
        ...(input.purchasingStaff
          ? { purchasingStaffProfileId: input.purchasingStaff.id }
          : {}),
        ...(deliveryAttempt
          ? {
              deliveryAttemptId: deliveryAttempt.id,
              deliveryStaffProfileId: deliveryAttempt.staffProfileId,
            }
          : {}),
      },
      resource: "orders",
      resourceId: order.id,
    });
    await this.outbox.enqueue({
      topic: input.auditAction,
      aggregateType: "order",
      aggregateId: order.id,
      payload: {
        orderNumber: order.orderNumber,
        totalMinor,
        placementSource: input.placementSource,
      },
    });
    return order;
  }

  private async valueItems(
    items: Array<{ productId: string; quantity: number }>,
  ) {
    const valuedItems: Array<{
      productId: string;
      productName: string;
      sku: string;
      unitPriceMinor: number;
      quantity: number;
      lineTotalMinor: number;
    }> = [];
    for (const item of [...items].sort((left, right) =>
      left.productId.localeCompare(right.productId),
    )) {
      const product = await this.products.findActiveById(item.productId);
      if (!product) {
        HttpError.conflict("An order product is no longer available");
      }
      valuedItems.push({
        productId: item.productId,
        productName: product.name,
        sku: product.sku,
        unitPriceMinor: product.priceMinor,
        quantity: item.quantity,
        lineTotalMinor: multiplyMinor(product.priceMinor, item.quantity),
      });
    }
    return valuedItems;
  }

  private async reserveRequestedBudget(order: Order, actorUserId: string) {
    const account = await this.requireBudgetAccount(order.familyProfileId);
    await this.ensureCapacity(account, order.totalMinor);
    const balance = applyBudgetBalanceDelta(account, {
      availableMinor: -order.totalMinor,
      reservedMinor: order.totalMinor,
    });
    const updated = await this.updateBudget(account.id, balance);
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

  private async settleInitialPurchase(
    order: Order,
    purchaseId: string,
    actualTotalMinor: number,
    confirmHigherAmount: boolean,
    actorUserId: string,
  ) {
    let account = await this.requireBudgetAccount(order.familyProfileId);
    const reserve = await this.ledger.findByIdempotencyKey(
      `order:${order.id}:budget:reserve`,
    );
    if (!reserve) {
      HttpError.conflict("Order budget reservation is missing");
    }
    const difference = actualTotalMinor - order.totalMinor;
    if (difference > 0) {
      if (!confirmHigherAmount) {
        HttpError.conflict("Higher purchase amount requires confirmation");
      }
      await this.ensureCapacity(account, difference);
      account = await this.applyLedgerDelta({
        account,
        delta: {
          availableMinor: -difference,
          reservedMinor: difference,
        },
        entryType: "order_reserve",
        amountMinor: -difference,
        sourceType: "order_purchase",
        sourceId: purchaseId,
        idempotencyKey: `purchase:${purchaseId}:additional-reserve`,
        actorUserId,
        reason: "Actual purchase total exceeded the requested estimate",
      });
    }
    account = await this.applyLedgerDelta({
      account,
      delta: {
        reservedMinor: -actualTotalMinor,
        spentMinor: actualTotalMinor,
      },
      entryType: "order_capture",
      amountMinor: -actualTotalMinor,
      sourceType: "order_purchase",
      sourceId: purchaseId,
      idempotencyKey: `purchase:${purchaseId}:capture`,
      actorUserId,
      reason: null,
    });
    if (difference < 0) {
      const release = -difference;
      await this.applyLedgerDelta({
        account,
        delta: { availableMinor: release, reservedMinor: -release },
        entryType: "order_release",
        amountMinor: release,
        sourceType: "order_purchase",
        sourceId: purchaseId,
        idempotencyKey: `purchase:${purchaseId}:variance-release`,
        actorUserId,
        reason: "Actual purchase total was below the requested estimate",
      });
    }
  }

  private async settleReplacementDifference(
    order: Order,
    current: OrderPurchaseRecord,
    replacementId: string,
    replacementTotalMinor: number,
    confirmHigherAmount: boolean,
    actorUserId: string,
    reason: string,
  ) {
    const difference = replacementTotalMinor - current.actualTotalMinor;
    if (difference === 0) return;
    let account = await this.requireBudgetAccount(order.familyProfileId);
    if (difference > 0) {
      if (!confirmHigherAmount) {
        HttpError.conflict("Higher replacement amount requires confirmation");
      }
      await this.ensureCapacity(account, difference);
      account = await this.applyLedgerDelta({
        account,
        delta: { availableMinor: -difference, reservedMinor: difference },
        entryType: "order_reserve",
        amountMinor: -difference,
        sourceType: "order_purchase",
        sourceId: replacementId,
        idempotencyKey: `purchase:${replacementId}:replacement-reserve`,
        actorUserId,
        reason,
      });
      await this.applyLedgerDelta({
        account,
        delta: { reservedMinor: -difference, spentMinor: difference },
        entryType: "order_capture",
        amountMinor: -difference,
        sourceType: "order_purchase",
        sourceId: replacementId,
        idempotencyKey: `purchase:${replacementId}:replacement-capture`,
        actorUserId,
        reason,
      });
      return;
    }
    const refund = -difference;
    await this.applyLedgerDelta({
      account,
      delta: { availableMinor: refund, spentMinor: -refund },
      entryType: "order_refund",
      amountMinor: refund,
      sourceType: "order_purchase",
      sourceId: replacementId,
      idempotencyKey: `purchase:${replacementId}:replacement-refund`,
      actorUserId,
      reason,
    });
  }

  private async cancelBeforePurchase(
    order: Order,
    actorUserId: string,
    reason: string | null,
    audience: "family" | "operator",
  ) {
    const activeDelivery = await this.deliveries.findActiveByOrderId(
      order.id,
      true,
    );
    if (activeDelivery) {
      await this.deliveries.cancel(
        activeDelivery.id,
        reason ?? "Order cancelled",
        new Date(),
      );
    }
    await this.releaseRequestedReservation(order, actorUserId, reason);
    const cancelled = await this.orders.update(order.id, {
      status: "cancelled",
      cancelledByUserId: actorUserId,
      cancelledAt: new Date(),
      cancellationReason: reason,
    });
    await this.recordTransition(
      order,
      cancelled,
      actorUserId,
      reason,
      "cancelled",
    );
    return this.orderDetail(cancelled, audience);
  }

  private async releaseRequestedReservation(
    order: Order,
    actorUserId: string,
    reason: string | null,
  ) {
    const account = await this.requireBudgetAccount(order.familyProfileId);
    const reserve = await this.ledger.findByIdempotencyKey(
      `order:${order.id}:budget:reserve`,
    );
    if (!reserve) {
      HttpError.conflict("Order budget reservation is missing");
    }
    await this.applyLedgerDelta({
      account,
      delta: {
        availableMinor: order.totalMinor,
        reservedMinor: -order.totalMinor,
      },
      entryType: "order_release",
      amountMinor: order.totalMinor,
      sourceType: "order",
      sourceId: order.id,
      idempotencyKey: `order:${order.id}:budget:release`,
      actorUserId,
      reason,
      reversesEntryId: reserve.id,
    });
  }

  private async refundPurchase(
    order: Order,
    purchase: OrderPurchaseRecord,
    actorUserId: string,
    reason: string,
  ) {
    const account = await this.requireBudgetAccount(order.familyProfileId);
    await this.applyLedgerDelta({
      account,
      delta: {
        availableMinor: purchase.actualTotalMinor,
        spentMinor: -purchase.actualTotalMinor,
      },
      entryType: "order_refund",
      amountMinor: purchase.actualTotalMinor,
      sourceType: "order_purchase",
      sourceId: purchase.id,
      idempotencyKey: `purchase:${purchase.id}:refund`,
      actorUserId,
      reason,
    });
  }

  private async refundLegacyCapture(
    order: Order,
    actorUserId: string,
    reason: string,
  ) {
    const account = await this.requireBudgetAccount(order.familyProfileId);
    const capture = await this.ledger.findByIdempotencyKey(
      `order:${order.id}:budget:capture`,
    );
    if (!capture) {
      HttpError.conflict("Legacy order budget capture is missing");
    }
    await this.applyLedgerDelta({
      account,
      delta: {
        availableMinor: order.totalMinor,
        spentMinor: -order.totalMinor,
      },
      entryType: "order_refund",
      amountMinor: order.totalMinor,
      sourceType: "order",
      sourceId: order.id,
      idempotencyKey: `order:${order.id}:budget:refund`,
      actorUserId,
      reason,
      reversesEntryId: capture.id,
    });
  }

  private async ensureCapacity(
    account: {
      id: string;
      availableMinor: number;
    },
    amountMinor: number,
  ) {
    if (account.availableMinor < amountMinor) {
      HttpError.conflict("Order total exceeds the available budget");
    }
    const month = currentMonth();
    const limit = await this.limits.findByAccountAndMonth(account.id, month);
    if (limit) {
      const used = await this.ledger.monthlyOrderUsage(account.id, month);
      if (amountMinor > limit.limitMinor - used) {
        HttpError.conflict("Order total exceeds the remaining monthly limit");
      }
    }
  }

  private async requireBudgetAccount(familyProfileId: string) {
    const account = await this.accounts.lockByFamilyId(familyProfileId);
    if (!account) {
      HttpError.notFound("Budget account not found");
    }
    return account;
  }

  private async updateBudget(
    accountId: string,
    balance: ReturnType<typeof applyBudgetBalanceDelta>,
  ) {
    const updated = await this.accounts.updateBalances(accountId, balance);
    if (!updated) {
      HttpError.notFound("Budget account not found");
    }
    return updated;
  }

  private async applyLedgerDelta(input: {
    account: {
      id: string;
      availableMinor: number;
      reservedMinor: number;
      spentMinor: number;
    };
    delta: Parameters<typeof applyBudgetBalanceDelta>[1];
    entryType:
      | "order_capture"
      | "order_refund"
      | "order_release"
      | "order_reserve";
    amountMinor: number;
    sourceType: string;
    sourceId: string;
    idempotencyKey: string;
    actorUserId: string;
    reason: string | null;
    reversesEntryId?: string;
  }) {
    const balance = applyBudgetBalanceDelta(input.account, input.delta);
    const updated = await this.updateBudget(input.account.id, balance);
    await this.ledger.append({
      budgetAccountId: input.account.id,
      entryType: input.entryType,
      amountMinor: input.amountMinor,
      availableAfterMinor: updated.availableMinor,
      reservedAfterMinor: updated.reservedMinor,
      spentAfterMinor: updated.spentMinor,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      idempotencyKey: input.idempotencyKey,
      actorUserId: input.actorUserId,
      reason: input.reason,
      reversesEntryId: input.reversesEntryId,
    });
    return updated;
  }

  private async recordTransition(
    before: Order,
    after: Order,
    actorUserId: string,
    reason: string | null,
    action: string,
    metadata: Record<string, unknown> = {},
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
      metadata: {
        fromStatus: before.status,
        toStatus: after.status,
        ...metadata,
      },
      resource: "orders",
      resourceId: after.id,
    });
    await this.outbox.enqueue({
      topic: `order.${action}`,
      aggregateType: "order",
      aggregateId: after.id,
      payload: {
        orderNumber: after.orderNumber,
        status: after.status,
        ...metadata,
      },
    });
  }

  private async ensureAssignableDeliveryStaff(staffProfileId: string) {
    const staff = await this.staff.findById(staffProfileId);
    if (!staff) HttpError.notFound("Delivery staff profile not found");
    if (staff.status !== "active" || !staff.functions.includes("delivery")) {
      HttpError.conflict("Active Delivery staff is required");
    }
    return staff;
  }

  private async ensureAssignablePurchasingStaff(staffProfileId: string) {
    const staff = await this.staff.findById(staffProfileId);
    if (!staff) HttpError.notFound("Purchasing staff profile not found");
    if (staff.status !== "active" || !staff.functions.includes("operator")) {
      HttpError.conflict("Active Operator staff is required for purchasing");
    }
    return staff;
  }

  private async ensurePendingAssignmentIdempotencyContext(
    order: Order,
    expected: {
      purchasingStaffProfileId?: string;
      deliveryStaffProfileId?: string;
    },
  ) {
    if (
      order.purchasingStaffProfileId !==
      (expected.purchasingStaffProfileId ?? null)
    ) {
      HttpError.conflict(
        "Idempotency key was already used with another purchasing assignment",
      );
    }
    const initialDelivery =
      await this.deliveries.findByAssignmentIdempotencyKey(
        order.submissionIdempotencyKey,
      );
    if (
      (initialDelivery?.orderId === order.id
        ? initialDelivery.staffProfileId
        : null) !== (expected.deliveryStaffProfileId ?? null)
    ) {
      HttpError.conflict(
        "Idempotency key was already used with another delivery assignment",
      );
    }
  }

  private ensureDeliveryIdempotencyContext(
    attempt: OrderDeliveryAttempt,
    orderId: string,
    staffProfileId?: string,
  ) {
    if (
      attempt.orderId !== orderId ||
      (staffProfileId !== undefined &&
        attempt.staffProfileId !== staffProfileId)
    ) {
      HttpError.conflict("Idempotency key was already used for another delivery command");
    }
  }

  private async recordDeliveryEvent(
    action: "assigned" | "reassigned",
    order: Order,
    attempt: OrderDeliveryAttempt,
    actorUserId: string,
    metadata: Record<string, unknown> = {},
  ) {
    const safeMetadata = {
      attemptId: attempt.id,
      staffProfileId: attempt.staffProfileId,
      status: attempt.status,
      ...metadata,
    };
    await this.audits.record({
      action: `order.delivery_${action}`,
      actorUserId,
      metadata: safeMetadata,
      resource: "orders",
      resourceId: order.id,
    });
    await this.outbox.enqueue({
      topic: `order.delivery_${action}`,
      aggregateType: "order",
      aggregateId: order.id,
      payload: {
        orderNumber: order.orderNumber,
        ...safeMetadata,
      },
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

  private async orderDetail(
    order: Order,
    audience: "family" | "operator",
  ) {
    const items = await this.orders.listItems(order.id);
    const statusEvents = await this.orders.listStatusEvents(order.id);
    const purchaseHistory = await this.purchases.listByOrderId(order.id);
    if (audience === "operator") {
      const deliveryAttempts = await this.deliveries.listByOrderId(order.id);
      const currentAttempt = deliveryAttempts.find((attempt) =>
        ["assigned", "in_progress"].includes(attempt.status),
      );
      const deliveryStaff = await Promise.all(
        [...new Set(deliveryAttempts.map(({ staffProfileId }) => staffProfileId))]
          .map((staffProfileId) => this.staff.findById(staffProfileId)),
      );
      const deliveryStaffById = new Map(
        deliveryStaff
          .filter((profile) => profile !== undefined)
          .map((profile) => [profile.id, profile]),
      );
      return {
        ...order,
        items,
        statusEvents,
        purchases: purchaseHistory,
        activePurchase:
          purchaseHistory.find(({ reversal }) => !reversal)?.purchase ?? null,
        requestedTotalMinor: order.totalMinor,
        actualTotalMinor:
          purchaseHistory.find(({ reversal }) => !reversal)?.purchase
            .actualTotalMinor ?? null,
        receiptRecorded: purchaseHistory.some(({ reversal }) => !reversal),
        deliveryProofRecorded: Boolean(order.deliveryProofStoragePath),
        currentDelivery: currentAttempt
          ? deliveryAttemptProjection(
              currentAttempt,
              deliveryStaffById.get(currentAttempt.staffProfileId),
            )
          : null,
        deliveryAttempts: deliveryAttempts.map((attempt) =>
          deliveryAttemptProjection(
            attempt,
            deliveryStaffById.get(attempt.staffProfileId),
          ),
        ),
      };
    }
    const deliveryAttempts = await this.deliveries.listByOrderId(order.id);
    const activeDelivery = deliveryAttempts.find((attempt) =>
      ["assigned", "in_progress"].includes(attempt.status),
    );
    const latestDelivery = activeDelivery ?? deliveryAttempts.at(-1) ?? null;
    const deliveryStaff = latestDelivery
      ? await this.staff.findById(latestDelivery.staffProfileId)
      : undefined;
    return {
      ...(await this.familyOrderProjection(order)),
      deliveryAssigned: Boolean(activeDelivery),
      deliveryName: latestDelivery?.deliveryNameSnapshot ?? null,
      delivery: latestDelivery
        ? familyDeliveryProjection(latestDelivery, deliveryStaff)
        : null,
      items,
      statusEvents: statusEvents.map(({ actorUserId, ...event }) => {
        void actorUserId;
        return event;
      }),
    };
  }

  private async familyOrderProjection(order: Order) {
    const purchase = await this.purchases.findActiveByOrderId(order.id);
    const {
      assistanceNote: _assistanceNote,
      submissionIdempotencyKey: _submissionIdempotencyKey,
      placedByUserId: _placedByUserId,
      purchasingStaffProfileId: _purchasingStaffProfileId,
      purchasingStaffNameSnapshot: _purchasingStaffNameSnapshot,
      purchasingAssignedAt: _purchasingAssignedAt,
      approvedByUserId: _approvedByUserId,
      rejectedByUserId: _rejectedByUserId,
      cancelledByUserId: _cancelledByUserId,
      deliveryStartedByUserId: _deliveryStartedByUserId,
      deliveredByUserId: _deliveredByUserId,
      deliveryConfirmationIdempotencyKey: _deliveryConfirmationIdempotencyKey,
      deliveryNote: _deliveryNote,
      deliveryProofStoragePath: _deliveryProofStoragePath,
      deliveryProofMediaType: _deliveryProofMediaType,
      deliveryProofByteSize: _deliveryProofByteSize,
      ...safeOrder
    } = order;
    void _assistanceNote;
    void _submissionIdempotencyKey;
    void _placedByUserId;
    void _purchasingStaffProfileId;
    void _purchasingStaffNameSnapshot;
    void _purchasingAssignedAt;
    void _approvedByUserId;
    void _rejectedByUserId;
    void _cancelledByUserId;
    void _deliveryStartedByUserId;
    void _deliveredByUserId;
    void _deliveryConfirmationIdempotencyKey;
    void _deliveryNote;
    void _deliveryProofStoragePath;
    void _deliveryProofMediaType;
    void _deliveryProofByteSize;
    return {
      ...safeOrder,
      assisted: order.placementSource === "operator_assisted",
      requestedTotalMinor: order.totalMinor,
      actualTotalMinor: purchase?.actualTotalMinor ?? null,
      differenceMinor: purchase
        ? purchase.actualTotalMinor - order.totalMinor
        : null,
      merchantName: purchase?.merchantName ?? null,
      purchasedAt: purchase?.purchasedAt ?? null,
      receiptRecorded: Boolean(purchase),
      deliveryProofRecorded: Boolean(order.deliveryProofStoragePath),
    };
  }

  private cartProjection(
    cart: {
      id: string;
      familyProfileId: string;
      createdAt: Date;
      updatedAt: Date;
    },
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
      available:
        item.productStatus === "active" && item.categoryStatus === "active",
    }));
    const totalMinor = sumMinor(
      projectedItems.map((item) => item.lineTotalMinor),
    );
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

function purchaseMetadata(order: Order, purchase: OrderPurchaseRecord) {
  return {
    merchantName: purchase.merchantName,
    requestedTotalMinor: order.totalMinor,
    actualTotalMinor: purchase.actualTotalMinor,
    differenceMinor: purchase.actualTotalMinor - order.totalMinor,
    evidenceRecorded: true,
  };
}

function deliveryAttemptSummary(attempt: OrderDeliveryAttempt) {
  return {
    attemptId: attempt.id,
    staffProfileId: attempt.staffProfileId,
    name: attempt.deliveryNameSnapshot,
    status: attempt.status,
    assignedAt: attempt.assignedAt,
  };
}

function familyDeliveryProjection(
  attempt: OrderDeliveryAttempt,
  staff?: { image: string | null; gender: "M" | "F" | null },
) {
  return {
    deliveryNameSnapshot: attempt.deliveryNameSnapshot,
    deliveryPhoneSnapshot: attempt.deliveryPhoneSnapshot,
    image: staff?.image ?? null,
    gender: staff?.gender ?? null,
    assignedAt: attempt.assignedAt,
    status: attempt.status,
  };
}

function deliveryAttemptProjection(
  attempt: OrderDeliveryAttempt,
  staff?: { image: string | null; gender: "M" | "F" | null },
) {
  return {
    id: attempt.id,
    orderId: attempt.orderId,
    staffProfileId: attempt.staffProfileId,
    status: attempt.status,
    deliveryNameSnapshot: attempt.deliveryNameSnapshot,
    deliveryPhoneSnapshot: attempt.deliveryPhoneSnapshot,
    image: staff?.image ?? null,
    gender: staff?.gender ?? null,
    affiliationSnapshot: attempt.affiliationSnapshot,
    companyNameSnapshot: attempt.companyNameSnapshot,
    assignedByUserId: attempt.assignedByUserId,
    assignedAt: attempt.assignedAt,
    startedAt: attempt.startedAt,
    failedAt: attempt.failedAt,
    completedAt: attempt.completedAt,
    cancelledAt: attempt.cancelledAt,
    failureReason: attempt.failureReason,
    cancellationReason: attempt.cancellationReason,
    createdAt: attempt.createdAt,
    updatedAt: attempt.updatedAt,
  };
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
  return `KAF-${nanoid(6).toUpperCase()}`;
}
