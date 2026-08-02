import { describe, expect, it } from "bun:test";
import { PgDialect } from "drizzle-orm/pg-core";
import { getGuardMetadata } from "najm-guard";
import { getMcpTools } from "najm-mcp";

import { AuditService } from "../src/modules/audit";
import {
  BudgetAccountRepository,
  BudgetLedgerRepository,
  MonthlyBudgetLimitRepository,
} from "../src/modules/budgets";
import { ProductRepository } from "../src/modules/catalog";
import { OutboxService } from "../src/modules/outbox";
import { FundingService } from "../src/modules/settings";
import { StaffRepository } from "../src/modules/staff";
import {
  cartItemDto,
  CartRepository,
  OrderController,
  OrderEvidenceService,
  OrderDeliveryRepository,
  OrderPurchaseRepository,
  OrderRepository,
  OrderService,
  OrderValidator,
  submitOrderDto,
} from "../src/modules/orders";
import { dominantOrderCategoryField } from "../src/modules/orders/orderQueries";

const householdId = "00000000-0000-4000-8000-000000000081";
const productId = "00000000-0000-4000-8000-000000000082";
const orderId = "00000000-0000-4000-8000-000000000083";
const accountId = "00000000-0000-4000-8000-000000000084";
const deliveryStaffId = "00000000-0000-4000-8000-000000000085";
const purchasingStaffId = "00000000-0000-4000-8000-000000000087";

describe("Phase 5 cart and route contracts", () => {
  it("ranks dominant categories by quantity with deterministic tie breakers", () => {
    const query = new PgDialect().sqlToQuery(dominantOrderCategoryField("name"));
    expect(query.sql).toContain("SUM(dominant_order_items.\"quantity\") DESC");
    expect(query.sql).toContain("MIN(dominant_order_items.\"created_at\") ASC");
    expect(query.sql).toContain("dominant_category.\"id\" ASC");
    expect(query.sql).toContain("LIMIT 1");
  });

  it("batches sponsor order enrichment without per-order repository reads", async () => {
    const calls = {
      deliveries: 0,
      items: 0,
      purchases: 0,
    };
    const summaries = [
      { id: "order-1", deliveryProofRecorded: false },
      { id: "order-2", deliveryProofRecorded: true },
    ];
    const service = new OrderService(
      {} as CartRepository,
      {
        listSupportedBySponsor: async () => summaries,
        listItemsByOrderIds: async (ids: readonly string[]) => {
          calls.items += 1;
          expect(ids).toEqual(["order-1", "order-2"]);
          return new Map([
            ["order-1", [{
              productNameSnapshot: "Rice",
              skuSnapshot: "RICE",
              quantity: 2,
              unitPriceMinor: 300,
              lineTotalMinor: 600,
            }]],
          ]);
        },
      } as unknown as OrderRepository,
      {
        listLatestByOrderIds: async (ids: readonly string[]) => {
          calls.deliveries += 1;
          expect(ids).toEqual(["order-1", "order-2"]);
          return new Map([
            ["order-1", { status: "assigned", deliveryNameSnapshot: "Amina" }],
          ]);
        },
      } as unknown as OrderDeliveryRepository,
      {
        listActiveByOrderIds: async (ids: readonly string[]) => {
          calls.purchases += 1;
          expect(ids).toEqual(["order-1", "order-2"]);
          return new Map([
            ["order-2", {
              actualTotalMinor: 775,
              merchantName: "Market",
              purchasedAt: new Date("2026-08-01T10:00:00.000Z"),
            }],
          ]);
        },
      } as unknown as OrderPurchaseRepository,
      {} as StaffRepository,
      {} as ProductRepository,
      {} as BudgetAccountRepository,
      {} as BudgetLedgerRepository,
      {} as MonthlyBudgetLimitRepository,
      {} as AuditService,
      {} as OutboxService,
      {} as OrderValidator,
      {} as FundingService,
      {} as OrderEvidenceService,
    );

    const result = await service.listSupported("sponsor-user", {});

    expect(calls).toEqual({ deliveries: 1, items: 1, purchases: 1 });
    expect(result[0]).toMatchObject({
      deliveryName: "Amina",
      deliveryStatus: "assigned",
      receiptRecorded: false,
      items: [{ productName: "Rice", quantity: 2 }],
    });
    expect(result[1]).toMatchObject({
      actualTotalMinor: 775,
      merchantName: "Market",
      receiptRecorded: true,
      items: [],
    });
  });

  it("accepts only positive bounded cart quantities and idempotent submission keys", () => {
    expect(
      cartItemDto.parse({ productId, quantity: "2", priceMinor: 1 }),
    ).toEqual({ productId, quantity: 2 });
    expect(cartItemDto.safeParse({ productId, quantity: 0 }).success).toBe(false);
    expect(
      submitOrderDto.safeParse({ idempotencyKey: "short" }).success,
    ).toBe(false);
  });

  it("exposes command-specific cart and lifecycle tools without a status update route", () => {
    const methods = getMcpTools(OrderController).map((tool) => tool.methodKey);

    expect(methods).toEqual(
      expect.arrayContaining([
        "getOwnCart",
        "addCartItem",
        "setCartItemQuantity",
        "removeCartItem",
        "clearCart",
        "submit",
        "submitAssisted",
        "approve",
        "reject",
        "recordPurchase",
        "replacePurchase",
        "assignDelivery",
        "reassignDelivery",
        "startDelivery",
        "failDelivery",
        "confirmDelivery",
        "deliver",
        "cancelOwn",
        "cancel",
        "delete",
      ]),
    );
    expect(methods).not.toContain("update");
    expect(methods).not.toContain("setStatus");
  });

  it("requires the bootstrap admin role and delete:orders permission", () => {
    const guards = getGuardMetadata(OrderController, "delete");
    expect(guards.map(({ guardClass }) => guardClass.name)).toEqual([
      "AdminRoleGuard",
      "AuthGuard",
      "PermissionGuard",
    ]);
    expect(guards.at(-1)?.params).toBe("delete:orders");
  });
});

describe("Phase 5 procurement-on-demand transactional order effects", () => {
  it("reserves budget from a product with no inventory balance and clears the cart", async () => {
    const { service, state } = orderService();

    const order = await service.submit("family-user", {
      idempotencyKey: "order-submit-0001",
    });

    expect(state.createdItems).toEqual([
      expect.objectContaining({
        productId,
        unitPriceMinor: 300,
        quantity: 2,
        lineTotalMinor: 600,
      }),
    ]);
    expect(state.balanceUpdates).toEqual([
      { availableMinor: 400, reservedMinor: 600, spentMinor: 0 },
    ]);
    expect(state.ledger).toEqual([
      expect.objectContaining({
        entryType: "order_reserve",
        amountMinor: -600,
        idempotencyKey: `order:${order.id}:budget:reserve`,
      }),
    ]);
    expect(state.effectOrder).toEqual(["budget"]);
    expect(state.clearedCartIds).toEqual(["cart-1"]);
  });

  it("rejects a low-budget order before it can persist a budget reservation", async () => {
    const { service, state } = orderService({ availableMinor: 599 });

    await expect(
      service.submit("family-user", { idempotencyKey: "order-submit-0002" }),
    ).rejects.toMatchObject({ status: 409 });

    expect(state.balanceUpdates).toEqual([]);
    expect(state.ledger).toEqual([]);
    expect(state.clearedCartIds).toEqual([]);
  });

  it("rejects order submission while family funding is pending", async () => {
    const { service, state } = orderService({ fundingActive: false });

    await expect(
      service.submit("family-user", { idempotencyKey: "order-submit-funding" }),
    ).rejects.toMatchObject({ status: 409 });

    expect(state.balanceUpdates).toEqual([]);
    expect(state.ledger).toEqual([]);
  });

  it("returns the original order for a duplicate submission key without new effects", async () => {
    const { service, state } = orderService({ existingSubmission: true });

    const order = await service.submit("family-user", {
      idempotencyKey: "order-submit-duplicate",
    });

    expect(order.id).toBe(orderId);
    expect(state.balanceUpdates).toEqual([]);
    expect(state.ledger).toEqual([]);
    expect(state.clearedCartIds).toEqual([]);
  });

  it("serializes concurrent duplicate submissions into one budget reservation", async () => {
    const { service, state } = orderService({ serializeCart: true });

    const [first, second] = await Promise.all([
      service.submit("family-user", { idempotencyKey: "order-submit-race" }),
      service.submit("family-user", { idempotencyKey: "order-submit-race" }),
    ]);

    expect(first.id).toBe(second.id);
    expect(state.balanceUpdates).toHaveLength(1);
    expect(state.ledger).toHaveLength(1);
    expect(state.clearedCartIds).toEqual(["cart-1"]);
  });

  it("creates an attributed assisted order without touching the family's cart", async () => {
    const { service, state } = orderService();

    const order = await service.submitAssisted(
      {
        familyProfileId: householdId,
        items: [{ productId, quantity: 2 }],
        assistanceChannel: "phone",
        assistanceNote: "Guardian could not use the portal",
        idempotencyKey: "assisted-order-0001",
      },
      "operator-user",
    );

    expect(order).toMatchObject({
      status: "pending",
      placementSource: "operator_assisted",
      placedByUserId: "operator-user",
      assistanceChannel: "phone",
      assistanceNote: "Guardian could not use the portal",
    });
    expect(state.balanceUpdates).toEqual([
      { availableMinor: 400, reservedMinor: 600, spentMinor: 0 },
    ]);
    expect(state.clearedCartIds).toEqual([]);
  });

  it("plans one dual-capability Staff member for purchase and delivery without advancing status", async () => {
    const { service, state } = orderService();

    const order = await service.submitAssisted(
      {
        familyProfileId: householdId,
        purchasingStaffProfileId: purchasingStaffId,
        deliveryStaffProfileId: purchasingStaffId,
        items: [{ productId, quantity: 2 }],
        assistanceChannel: "in_person",
        idempotencyKey: "assisted-order-dual-0001",
      },
      "operator-user",
    );

    expect(order).toMatchObject({
      status: "pending",
      purchasingStaffProfileId: purchasingStaffId,
      purchasingStaffNameSnapshot: "Amina Delivery",
    });
    expect(state.deliveryAttempts).toHaveLength(1);
    expect(state.deliveryAttempts[0]).toMatchObject({
      orderId,
      staffProfileId: purchasingStaffId,
      status: "assigned",
      assignmentIdempotencyKey: "assisted-order-dual-0001",
    });
    expect(state.auditEvents).toContainEqual(
      expect.objectContaining({
        action: "order.assisted_submitted",
        metadata: expect.objectContaining({
          purchasingStaffProfileId: purchasingStaffId,
          deliveryStaffProfileId: purchasingStaffId,
        }),
      }),
    );
  });

  it("releases a lower receipt variance and captures only the actual purchase", async () => {
    const { service, state } = orderService({
      status: "approved",
      availableMinor: 400,
      reservedMinor: 600,
      reserveLedger: { id: "reserve-ledger" },
    });

    await service.recordPurchase(
      orderId,
      purchaseInput({ actualTotalMinor: 500, idempotencyKey: "purchase-lower-0001" }),
      "operator-user",
    );

    expect(state.balanceUpdates).toEqual([
      { availableMinor: 400, reservedMinor: 100, spentMinor: 500 },
      { availableMinor: 500, reservedMinor: 0, spentMinor: 500 },
    ]);
    expect(state.ledger.map((entry) => entry.entryType)).toEqual([
      "order_capture",
      "order_release",
    ]);
  });

  it("requires confirmation and available budget for a higher receipt variance", async () => {
    const withoutConfirmation = orderService({
      status: "approved",
      availableMinor: 400,
      reservedMinor: 600,
      reserveLedger: { id: "reserve-ledger" },
    });
    await expect(
      withoutConfirmation.service.recordPurchase(
        orderId,
        purchaseInput({ actualTotalMinor: 700, idempotencyKey: "purchase-high-0001" }),
        "operator-user",
      ),
    ).rejects.toMatchObject({ status: 409 });
    expect(withoutConfirmation.state.balanceUpdates).toEqual([]);

    const confirmed = orderService({
      status: "approved",
      availableMinor: 400,
      reservedMinor: 600,
      reserveLedger: { id: "reserve-ledger" },
    });
    await confirmed.service.recordPurchase(
      orderId,
      purchaseInput({
        actualTotalMinor: 700,
        confirmHigherAmount: true,
        idempotencyKey: "purchase-high-0002",
      }),
      "operator-user",
    );
    expect(confirmed.state.balanceUpdates).toEqual([
      { availableMinor: 300, reservedMinor: 700, spentMinor: 0 },
      { availableMinor: 300, reservedMinor: 0, spentMinor: 700 },
    ]);
  });

  it("tracks purchase delivery to a terminal state without another financial effect", async () => {
    const { service, state } = orderService({ status: "purchased" });
    state.activePurchase = purchaseRecord();

    await service.assignDelivery(
      orderId,
      {
        staffProfileId: deliveryStaffId,
        idempotencyKey: "delivery-assign-0001",
      },
      "operator-user",
    );

    const started = await service.startDelivery(
      orderId,
      { idempotencyKey: "delivery-start-0001" },
      "operator-user",
    );
    expect(started.status).toBe("out_for_delivery");
    expect(state.balanceUpdates).toEqual([]);

    const delivered = await service.confirmDelivery(
      orderId,
      {
        confirmationMethod: "operator_confirmation",
        deliveryNote: "Handed to the guardian",
        idempotencyKey: "delivery-confirm-0001",
      },
      "operator-user",
    );
    expect(delivered).toMatchObject({
      status: "delivered",
      deliveryConfirmationMethod: "operator_confirmation",
    });
    expect(state.balanceUpdates).toEqual([]);
    expect(state.ledger).toEqual([]);

    const familyDetail = await service.getOwn(orderId, "family-user");
    expect(familyDetail).toMatchObject({
      deliveryAssigned: false,
      deliveryName: "Amina Delivery",
      delivery: {
        deliveryNameSnapshot: "Amina Delivery",
        deliveryPhoneSnapshot: "+212600001122",
        image: "/api/staff-images/files/serve/amina.webp",
        gender: "F",
        status: "delivered",
      },
    });
  });

  it("assigns and reassigns delivery while approved but still requires purchase before start", async () => {
    const { service, state } = orderService({ status: "approved" });
    await service.assignDelivery(
      orderId,
      { staffProfileId: deliveryStaffId, idempotencyKey: "delivery-approved-assign-0001" },
      "operator-user",
    );

    const replacementStaffId = "00000000-0000-4000-8000-000000000086";
    await service.reassignDelivery(
      orderId,
      {
        staffProfileId: replacementStaffId,
        reason: "Buyer route changed",
        idempotencyKey: "delivery-approved-reassign-0001",
      },
      "operator-user",
    );

    expect(state.deliveryAttempts).toHaveLength(2);
    expect(state.deliveryAttempts[1]).toMatchObject({
      status: "assigned",
      staffProfileId: replacementStaffId,
    });
    await expect(
      service.startDelivery(
        orderId,
        { idempotencyKey: "delivery-approved-start-0001" },
        "operator-user",
      ),
    ).rejects.toMatchObject({ status: 409 });
  });

  it("cancels an approved order's active delivery assignment", async () => {
    const { service, state } = orderService({
      status: "approved",
      reservedMinor: 600,
      reserveLedger: { id: "reserve-ledger" },
    });
    await service.assignDelivery(
      orderId,
      { staffProfileId: deliveryStaffId, idempotencyKey: "delivery-approved-cancel-0001" },
      "operator-user",
    );

    await service.cancel(
      orderId,
      { reason: "Family request changed" },
      "operator-user",
    );

    expect(state.deliveryAttempts[0]).toMatchObject({
      status: "cancelled",
      cancellationReason: "Family request changed",
    });
    expect(state.order.status).toBe("cancelled");
  });

  it("reassigns before start and retains the cancelled assignment", async () => {
    const { service, state } = orderService({ status: "purchased" });
    state.activePurchase = purchaseRecord();
    await service.assignDelivery(
      orderId,
      { staffProfileId: deliveryStaffId, idempotencyKey: "delivery-assign-1001" },
      "operator-user",
    );
    const replacementStaffId = "00000000-0000-4000-8000-000000000086";
    await service.reassignDelivery(
      orderId,
      {
        staffProfileId: replacementStaffId,
        reason: "Courier shift changed",
        idempotencyKey: "delivery-reassign-1001",
      },
      "operator-user",
    );

    expect(state.deliveryAttempts).toHaveLength(2);
    expect(state.deliveryAttempts[0]).toMatchObject({
      status: "cancelled",
      cancellationReason: "Courier shift changed",
    });
    expect(state.deliveryAttempts[1]).toMatchObject({
      status: "assigned",
      staffProfileId: replacementStaffId,
    });
    const detail = await service.get(orderId) as {
      currentDelivery: { image: string | null; gender: "M" | "F" | null } | null;
      deliveryAttempts: Array<{ image: string | null; gender: "M" | "F" | null }>;
    };
    expect(detail.currentDelivery).toMatchObject({
      image: "/api/staff-images/files/serve/amina.webp",
      gender: "F",
    });
    expect(detail.deliveryAttempts[1]).toMatchObject({
      image: "/api/staff-images/files/serve/amina.webp",
      gender: "F",
    });
  });

  it("records failure and returns the order to purchased without a budget effect", async () => {
    const { service, state } = orderService({ status: "purchased" });
    state.activePurchase = purchaseRecord();
    await service.assignDelivery(
      orderId,
      { staffProfileId: deliveryStaffId, idempotencyKey: "delivery-assign-2001" },
      "operator-user",
    );
    await service.startDelivery(
      orderId,
      { idempotencyKey: "delivery-start-2001" },
      "operator-user",
    );
    const failed = await service.failDelivery(
      orderId,
      { reason: "Recipient unavailable", idempotencyKey: "delivery-fail-2001" },
      "operator-user",
    );

    expect(failed.status).toBe("purchased");
    expect(state.deliveryAttempts[0]).toMatchObject({
      status: "failed",
      failureReason: "Recipient unavailable",
    });
    expect(state.balanceUpdates).toEqual([]);
  });

  it("rejects assignment to inactive Delivery staff", async () => {
    const { service } = orderService({
      status: "purchased",
      deliveryStaffActive: false,
    });
    await expect(
      service.assignDelivery(
        orderId,
        { staffProfileId: deliveryStaffId, idempotencyKey: "delivery-assign-3001" },
        "operator-user",
      ),
    ).rejects.toMatchObject({ status: 409 });
  });

  it("exposes only the delivery name while keeping private delivery data out of family detail", async () => {
    const { service, state } = orderService({ status: "purchased" });
    state.events.push({
      id: "event-1",
      orderId,
      fromStatus: "approved",
      toStatus: "purchased",
      actorUserId: "operator-user",
      reason: null,
      createdAt: new Date(),
    });
    await service.assignDelivery(
      orderId,
      { staffProfileId: deliveryStaffId, idempotencyKey: "delivery-assign-4001" },
      "operator-user",
    );

    const family = await service.getOwn(orderId, "family-user");
    expect((family as { deliveryAssigned: boolean }).deliveryAssigned).toBe(true);
    expect((family as { deliveryName: string | null }).deliveryName).toBe(
      "Amina Delivery",
    );
    expect(family).not.toHaveProperty("currentDelivery");
    expect(family).not.toHaveProperty("deliveryAttempts");
    expect(family).not.toHaveProperty("deliveryStartedByUserId");
    expect(family).not.toHaveProperty("deliveryConfirmationIdempotencyKey");
    expect(family.statusEvents[0]).not.toHaveProperty("actorUserId");
  });

  it("serializes transaction-bound order detail reads", async () => {
    const { service, state } = orderService({
      rejectConcurrentDetailReads: true,
    });

    await service.getOwn(orderId, "family-user");

    expect(state.detailReads).toEqual([
      "items",
      "statusEvents",
      "purchaseHistory",
    ]);
  });

  it("keeps approval reserved, captures the actual purchase, and refunds it on cancellation", async () => {
    const { service, state } = orderService({
      status: "pending",
      availableMinor: 400,
      reservedMinor: 600,
      reserveLedger: { id: "reserve-ledger" },
      orderItems: [orderItemRecord()],
    });

    const approved = await service.approve(orderId, "operator-user");

    expect(approved.status).toBe("approved");
    expect(state.balanceUpdates).toEqual([]);
    expect(state.ledger).toEqual([]);

    state.order = orderRecord({ status: "approved" });
    await service.recordPurchase(
      orderId,
      {
        merchantName: "Marjane",
        purchasedAt: new Date("2026-07-27T12:00:00.000Z"),
        actualTotalMinor: 600,
        receiptStoragePath:
          "/api/order-evidence/receipts/serve/00000000-0000-4000-8000-000000000099.pdf",
        receiptMediaType: "application/pdf",
        receiptByteSize: 100,
        idempotencyKey: "purchase-record-0001",
      },
      "operator-user",
    );
    expect(state.balanceUpdates).toEqual([
      { availableMinor: 400, reservedMinor: 0, spentMinor: 600 },
    ]);
    expect(state.ledger).toEqual([
      expect.objectContaining({
        entryType: "order_capture",
        amountMinor: -600,
        sourceType: "order_purchase",
      }),
    ]);

    state.order = orderRecord({ status: "purchased" });
    state.balanceUpdates.length = 0;
    state.ledger.length = 0;
    state.effectOrder.length = 0;
    state.captureLedger = { id: "capture-ledger" };
    state.account = accountRecord({ availableMinor: 400, spentMinor: 600 });

    const cancelled = await service.cancel(
      orderId,
      {
        reason: "Items can be returned to the supermarket",
        confirmRecoverableGoods: true,
      },
      "operator-user",
    );

    expect(cancelled.status).toBe("cancelled");
    expect(state.balanceUpdates).toEqual([
      { availableMinor: 1000, reservedMinor: 0, spentMinor: 0 },
    ]);
    expect(state.ledger).toEqual([
      expect.objectContaining({
        entryType: "order_refund",
        sourceType: "order_purchase",
      }),
    ]);
    expect(state.effectOrder).toEqual(["budget"]);
  });

  it("rejects forbidden state transitions without writing an order effect", async () => {
    const { service, state } = orderService({ status: "delivered" });

    await expect(service.approve(orderId, "operator-user")).rejects.toMatchObject({
      status: 409,
    });

    expect(state.balanceUpdates).toEqual([]);
    expect(state.ledger).toEqual([]);
  });

  it("permanently deletes a mistaken pre-purchase order and rebuilds its budget", async () => {
    const { service, state } = orderService({
      status: "pending",
      availableMinor: 400,
      reservedMinor: 600,
    });
    state.deliveryAttempts.push({
      status: "assigned",
      startedAt: null,
      failedAt: null,
      completedAt: null,
    });

    const deleted = await service.delete(orderId, "admin-user");

    expect(deleted.id).toBe(orderId);
    expect(state.erasedOrderLedger).toEqual([
      { budgetAccountId: accountId, orderId },
    ]);
    expect(state.balanceUpdates).toEqual([
      { availableMinor: 1000, reservedMinor: 0, spentMinor: 0 },
    ]);
    expect(state.deletedOrderIds).toEqual([orderId]);
    expect(state.auditEvents).toContainEqual(
      expect.objectContaining({
        action: "order.deleted",
        actorUserId: "admin-user",
        metadata: {
          permanent: true,
          previousStatus: "pending",
          ledgerEntriesRemoved: 1,
        },
      }),
    );
  });

  it("refuses permanent deletion after delivery execution has started", async () => {
    const { service, state } = orderService({ status: "cancelled" });
    state.deliveryAttempts.push({
      status: "cancelled",
      startedAt: new Date("2026-07-31T12:00:00.000Z"),
      failedAt: null,
      completedAt: null,
    });

    await expect(service.delete(orderId, "admin-user")).rejects.toMatchObject({
      message: "Orders with started delivery history cannot be permanently deleted",
      status: 409,
    });

    expect(state.erasedOrderLedger).toEqual([]);
    expect(state.deletedOrderIds).toEqual([]);
  });

  it("refuses permanent deletion after purchase history exists", async () => {
    const { service, state } = orderService({ status: "purchased" });
    state.activePurchase = purchaseRecord();

    await expect(service.delete(orderId, "admin-user")).rejects.toMatchObject({
      status: 409,
    });

    expect(state.erasedOrderLedger).toEqual([]);
    expect(state.deletedOrderIds).toEqual([]);
  });
});

function orderService(options: {
  status?: "pending" | "approved" | "rejected" | "purchased" | "cancelled" | "out_for_delivery" | "delivered";
  availableMinor?: number;
  reservedMinor?: number;
  reserveLedger?: { id: string };
  captureLedger?: { id: string };
  orderItems?: ReturnType<typeof orderItemRecord>[];
  existingSubmission?: boolean;
  serializeCart?: boolean;
  fundingActive?: boolean;
  deliveryStaffActive?: boolean;
  rejectConcurrentDetailReads?: boolean;
} = {}) {
  let createdSubmission = false;
  let cartLocked = false;
  let detailReadInProgress = false;
  const cartWaiters: Array<() => void> = [];
  const releaseCart = () => {
    const next = cartWaiters.shift();
    if (next) {
      next();
    } else {
      cartLocked = false;
    }
  };
  const state = {
    account: accountRecord({
      availableMinor: options.availableMinor ?? 1000,
      reservedMinor: options.reservedMinor ?? 0,
    }),
    order: orderRecord({ status: options.status ?? "pending" }),
    orderItems: options.orderItems ?? [],
    reserveLedger: options.reserveLedger,
    captureLedger: options.captureLedger,
    activePurchase: undefined as
      | ReturnType<typeof purchaseRecord>
      | undefined,
    createdItems: [] as Record<string, unknown>[],
    balanceUpdates: [] as Record<string, unknown>[],
    ledger: [] as Record<string, unknown>[],
    clearedCartIds: [] as string[],
    events: [] as Record<string, unknown>[],
    effectOrder: [] as Array<"inventory" | "budget">,
    erasedOrderLedger: [] as Array<{ budgetAccountId: string; orderId: string }>,
    deletedOrderIds: [] as string[],
    auditEvents: [] as Record<string, unknown>[],
    deliveryAttempts: [] as Record<string, unknown>[],
    detailReads: [] as string[],
  };
  const detailRead = async <T>(label: string, value: T) => {
    if (options.rejectConcurrentDetailReads && detailReadInProgress) {
      throw new Error(`Concurrent detail read '${label}'`);
    }
    detailReadInProgress = true;
    state.detailReads.push(label);
    await Promise.resolve();
    detailReadInProgress = false;
    return value;
  };
  const carts = {
    findByFamilyId: async () => cartRecord(),
    createForFamily: async () => cartRecord(),
    lockByFamilyId: async () => {
      if (options.serializeCart && cartLocked) {
        await new Promise<void>((resolve) => cartWaiters.push(resolve));
      }
      cartLocked = true;
      return cartRecord();
    },
    findItem: async () => undefined,
    createItem: async () => undefined,
    setItemQuantity: async () => undefined,
    removeItem: async () => undefined,
    clear: async (cartId: string) => {
      state.clearedCartIds.push(cartId);
      if (options.serializeCart) {
        releaseCart();
      }
    },
    listItems: async () => [
      {
        id: "cart-item-1",
        productId,
        quantity: 2,
        productName: "Old rice title",
        sku: "RICE-5KG",
        priceMinor: 250,
        currency: "MAD",
        productStatus: "active",
        categoryStatus: "active",
      },
    ],
  } as unknown as CartRepository;
  const orders = {
    findByIdempotencyKey: async () =>
      options.existingSubmission || createdSubmission ? state.order : undefined,
    create: async (input: Record<string, unknown>) => {
      state.order = orderRecord(input);
      createdSubmission = true;
      return state.order;
    },
    createItems: async (items: Record<string, unknown>[]) => {
      state.createdItems.push(...items);
      state.orderItems = items.map((item) => orderItemRecord(item));
      return state.orderItems;
    },
    listItems: async () => detailRead("items", state.orderItems),
    listStatusEvents: async () => detailRead("statusEvents", state.events),
    appendStatusEvent: async (input: Record<string, unknown>) => {
      state.events.push(input);
      return input;
    },
    lockById: async () => state.order,
    update: async (_id: string, input: Record<string, unknown>) => {
      state.order = orderRecord({ ...state.order, ...input });
      return state.order;
    },
    hardDelete: async (id: string) => {
      state.deletedOrderIds.push(id);
      return state.order;
    },
  } as unknown as OrderRepository;
  const purchases = {
    findByIdempotencyKey: async () => undefined,
    findActiveByOrderId: async () => state.activePurchase,
    create: async (input: Record<string, unknown>) => {
      state.activePurchase = purchaseRecord(input);
      return state.activePurchase;
    },
    reverse: async (input: Record<string, unknown>) => input,
    listByOrderId: async () =>
      detailRead(
        "purchaseHistory",
        state.activePurchase
          ? [{ purchase: state.activePurchase, reversal: null }]
          : [],
      ),
  } as unknown as OrderPurchaseRepository;
  const deliveries = {
    findByAssignmentIdempotencyKey: async (key: string) =>
      state.deliveryAttempts.find(
        (attempt) => attempt.assignmentIdempotencyKey === key,
      ),
    findByStartIdempotencyKey: async (key: string) =>
      state.deliveryAttempts.find((attempt) => attempt.startIdempotencyKey === key),
    findByFailIdempotencyKey: async (key: string) =>
      state.deliveryAttempts.find((attempt) => attempt.failIdempotencyKey === key),
    findByConfirmationIdempotencyKey: async (key: string) =>
      state.deliveryAttempts.find(
        (attempt) => attempt.confirmationIdempotencyKey === key,
      ),
    findActiveByOrderId: async () =>
      state.deliveryAttempts.find((attempt) =>
        ["assigned", "in_progress"].includes(String(attempt.status)),
      ),
    create: async (input: Record<string, unknown>) => {
      const attempt = {
        id: `delivery-attempt-${state.deliveryAttempts.length + 1}`,
        assignedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        startedAt: null,
        failedAt: null,
        completedAt: null,
        cancelledAt: null,
        failureReason: null,
        cancellationReason: null,
        startIdempotencyKey: null,
        failIdempotencyKey: null,
        confirmationIdempotencyKey: null,
        ...input,
      };
      state.deliveryAttempts.push(attempt);
      return attempt;
    },
    start: async (id: string, key: string, startedAt: Date) => {
      const attempt = state.deliveryAttempts.find((row) => row.id === id)!;
      Object.assign(attempt, {
        status: "in_progress",
        startedAt,
        startIdempotencyKey: key,
      });
      return attempt;
    },
    complete: async (id: string, key: string, completedAt: Date) => {
      const attempt = state.deliveryAttempts.find((row) => row.id === id)!;
      Object.assign(attempt, {
        status: "delivered",
        completedAt,
        confirmationIdempotencyKey: key,
      });
      return attempt;
    },
    fail: async (id: string, reason: string, key: string, failedAt: Date) => {
      const attempt = state.deliveryAttempts.find((row) => row.id === id)!;
      Object.assign(attempt, {
        status: "failed",
        failureReason: reason,
        failedAt,
        failIdempotencyKey: key,
      });
      return attempt;
    },
    cancel: async (id: string, reason: string, cancelledAt: Date) => {
      const attempt = state.deliveryAttempts.find((row) => row.id === id)!;
      Object.assign(attempt, {
        status: "cancelled",
        cancellationReason: reason,
        cancelledAt,
      });
      return attempt;
    },
    listByOrderId: async () => state.deliveryAttempts,
    listLatestByOrderIds: async () => new Map(),
  } as unknown as OrderDeliveryRepository;
  const service = new OrderService(
    carts,
    orders,
    deliveries,
    purchases,
    {
      findById: async (id: string) => ({
        id,
        name: "Amina Delivery",
        phone: "+212600001122",
        image: "/api/staff-images/files/serve/amina.webp",
        gender: "F",
        affiliation: "internal",
        companyName: null,
        status: options.deliveryStaffActive === false ? "inactive" : "active",
        functions:
          id === purchasingStaffId
            ? ["operator", "delivery"]
            : ["delivery"],
      }),
    } as unknown as StaffRepository,
    {
      findActiveById: async () => ({
        id: productId,
        name: "Rice 5kg current price",
        sku: "RICE-5KG",
        priceMinor: 300,
      }),
    } as unknown as ProductRepository,
    {
      lockByFamilyId: async () => state.account,
      updateBalances: async (_id: string, balance: Record<string, unknown>) => {
        state.effectOrder.push("budget");
        state.balanceUpdates.push(balance);
        state.account = accountRecord(balance);
        return state.account;
      },
    } as unknown as BudgetAccountRepository,
    {
      monthlyOrderUsage: async () => 0,
      append: async (input: Record<string, unknown>) => {
        state.ledger.push(input);
        return { id: `ledger-${state.ledger.length}`, ...input };
      },
      findByIdempotencyKey: async (key: string) =>
        key.endsWith(":reserve")
          ? state.reserveLedger
          : key.endsWith(":capture")
            ? state.captureLedger
            : undefined,
      erasePrePurchaseOrderEntries: async (input: {
        budgetAccountId: string;
        orderId: string;
      }) => {
        state.erasedOrderLedger.push(input);
        return {
          balance: {
            availableMinor: 1000,
            reservedMinor: 0,
            spentMinor: 0,
          },
          deletedCount: 1,
        };
      },
    } as unknown as BudgetLedgerRepository,
    {
      findByAccountAndMonth: async () => null,
    } as unknown as MonthlyBudgetLimitRepository,
    {
      record: async (input: Record<string, unknown>) => {
        state.auditEvents.push(input);
        return input;
      },
    } as unknown as AuditService,
    { enqueue: async () => undefined } as unknown as OutboxService,
    {
      ensureFamily: async () => familyRecord(),
      ensureActiveFamilyById: async () => familyRecord(),
      ensureSameFamily: () => undefined,
      ensureIdempotencyContext: () => undefined,
      ensureStatus: (order: { status: string }, expected: string) => {
        if (order.status !== expected) {
          throw { status: 409 };
        }
      },
      ensureOneOfStatuses: (order: { status: string }, expected: string[]) => {
        if (!expected.includes(order.status)) {
          throw { status: 409 };
        }
      },
      ensureLockedOrderOwnedBy: () => undefined,
      ensureOrderExists: async () => state.order,
      ensureOrderOwnedByFamily: async () => ({
        family: familyRecord(),
        order: state.order,
      }),
    } as unknown as OrderValidator,
    {
      ensureOrderEligible: async () => {
        if (options.fundingActive === false) throw { status: 409 };
        return { status: "active" };
      },
    } as unknown as FundingService,
    {
      ensureManagedReference: async () => undefined,
    } as unknown as OrderEvidenceService,
  );
  return { service, state };
}

function cartRecord() {
  return {
    id: "cart-1",
    familyProfileId: householdId,
    createdAt: new Date("2026-07-16T00:00:00.000Z"),
    updatedAt: new Date("2026-07-16T00:00:00.000Z"),
  };
}

function familyRecord() {
  return {
    role: "family",
    id: householdId,
    userId: "family-user",
    status: "active",
    guardianLegalName: "Family guardian",
    exactAddress: "Private address",
    phone: "+212600000000",
  };
}

function accountRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: accountId,
    familyProfileId: householdId,
    currency: "MAD",
    availableMinor: 1000,
    reservedMinor: 0,
    spentMinor: 0,
    version: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function orderRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: orderId,
    orderNumber: "KAF-20260716-TEST0001",
    submissionIdempotencyKey: "order-submit-base",
    familyProfileId: householdId,
    placementSource: "family_self_service",
    assistanceChannel: null,
    assistanceNote: null,
    status: "pending",
    subtotalMinor: 600,
    totalMinor: 600,
    currency: "MAD",
    guardianLegalNameSnapshot: "Family guardian",
    deliveryAddressSnapshot: "Private address",
    deliveryPhoneSnapshot: "+212600000000",
    placedByUserId: "family-user",
    purchasingStaffProfileId: null,
    purchasingStaffNameSnapshot: null,
    purchasingAssignedAt: null,
    approvedByUserId: null,
    approvedAt: null,
    rejectedByUserId: null,
    rejectedAt: null,
    rejectionReason: null,
    cancelledByUserId: null,
    cancelledAt: null,
    cancellationReason: null,
    preparationStartedAt: null,
    deliveryStartedAt: null,
    deliveryStartedByUserId: null,
    deliveredAt: null,
    deliveredByUserId: null,
    deliveryConfirmationMethod: null,
    deliveryNote: null,
    deliveryProofStoragePath: null,
    deliveryProofMediaType: null,
    deliveryProofByteSize: null,
    deliveryConfirmationIdempotencyKey: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function purchaseInput(overrides: Record<string, unknown> = {}) {
  return {
    merchantName: "Marjane",
    purchasedAt: new Date("2026-07-27T12:00:00.000Z"),
    actualTotalMinor: 600,
    receiptStoragePath:
      "/api/order-evidence/receipts/serve/00000000-0000-4000-8000-000000000099.pdf",
    receiptMediaType: "application/pdf" as const,
    receiptByteSize: 100,
    confirmHigherAmount: false,
    idempotencyKey: "purchase-record-0001",
    ...overrides,
  };
}

function purchaseRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: "00000000-0000-4000-8000-000000000099",
    orderId,
    merchantName: "Marjane",
    receiptNumber: null,
    purchasedAt: new Date("2026-07-27T12:00:00.000Z"),
    actualTotalMinor: 600,
    currency: "MAD",
    receiptStoragePath:
      "/api/order-evidence/receipts/serve/00000000-0000-4000-8000-000000000099.pdf",
    receiptMediaType: "application/pdf",
    receiptByteSize: 100,
    recordedByUserId: "operator-user",
    idempotencyKey: "purchase-record-0001",
    replacesPurchaseId: null,
    createdAt: new Date(),
    ...overrides,
  };
}

function orderItemRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: "order-item-1",
    orderId,
    productId,
    productNameSnapshot: "Rice 5kg current price",
    skuSnapshot: "RICE-5KG",
    unitPriceMinor: 300,
    quantity: 2,
    lineTotalMinor: 600,
    createdAt: new Date(),
    ...overrides,
  };
}
