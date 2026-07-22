import { describe, expect, it } from "bun:test";
import { getMcpTools } from "najm-mcp";

import { AuditService } from "../src/modules/audit";
import {
  BudgetAccountRepository,
  BudgetLedgerRepository,
  MonthlyBudgetLimitRepository,
} from "../src/modules/budgets";
import { CatalogService, ProductRepository } from "../src/modules/catalog";
import { OutboxService } from "../src/modules/outbox";
import { FundingService } from "../src/modules/settings";
import {
  cartItemDto,
  CartRepository,
  OrderController,
  OrderRepository,
  OrderService,
  OrderValidator,
  submitOrderDto,
} from "../src/modules/orders";

const householdId = "00000000-0000-4000-8000-000000000081";
const productId = "00000000-0000-4000-8000-000000000082";
const orderId = "00000000-0000-4000-8000-000000000083";
const accountId = "00000000-0000-4000-8000-000000000084";

describe("Phase 5 cart and route contracts", () => {
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
        "approve",
        "reject",
        "startPreparation",
        "deliver",
        "cancelOwn",
        "cancel",
      ]),
    );
    expect(methods).not.toContain("update");
    expect(methods).not.toContain("setStatus");
  });
});

describe("Phase 5 transactional order effects", () => {
  it("recalculates a stale cart price, reserves stock and budget, and clears the cart", async () => {
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
    expect(state.inventory).toEqual([
      expect.objectContaining({
        productId,
        quantity: 2,
        idempotencyKey: `order:${order.id}:inventory:reserve:${productId}`,
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
    expect(state.effectOrder).toEqual(["inventory", "budget"]);
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

    expect(state.inventory).toEqual([]);
    expect(state.balanceUpdates).toEqual([]);
    expect(state.ledger).toEqual([]);
  });

  it("rejects a low-stock order before it can reserve a budget", async () => {
    const { service, state } = orderService({ reserveError: true });

    await expect(
      service.submit("family-user", { idempotencyKey: "order-submit-0003" }),
    ).rejects.toMatchObject({ status: 409 });

    expect(state.balanceUpdates).toEqual([]);
    expect(state.ledger).toEqual([]);
    expect(state.clearedCartIds).toEqual([]);
  });

  it("returns the original order for a duplicate submission key without new effects", async () => {
    const { service, state } = orderService({ existingSubmission: true });

    const order = await service.submit("family-user", {
      idempotencyKey: "order-submit-duplicate",
    });

    expect(order.id).toBe(orderId);
    expect(state.inventory).toEqual([]);
    expect(state.balanceUpdates).toEqual([]);
    expect(state.ledger).toEqual([]);
    expect(state.clearedCartIds).toEqual([]);
  });

  it("serializes concurrent duplicate submissions into one reservation set", async () => {
    const { service, state } = orderService({ serializeCart: true });

    const [first, second] = await Promise.all([
      service.submit("family-user", { idempotencyKey: "order-submit-race" }),
      service.submit("family-user", { idempotencyKey: "order-submit-race" }),
    ]);

    expect(first.id).toBe(second.id);
    expect(state.inventory).toHaveLength(1);
    expect(state.balanceUpdates).toHaveLength(1);
    expect(state.ledger).toHaveLength(1);
    expect(state.clearedCartIds).toEqual(["cart-1"]);
  });

  it("captures approved reservations and refunds allocated stock and money on cancellation", async () => {
    const { service, state } = orderService({
      status: "pending",
      availableMinor: 400,
      reservedMinor: 600,
      reserveLedger: { id: "reserve-ledger" },
      orderItems: [orderItemRecord()],
    });

    const approved = await service.approve(orderId, "operator-user");

    expect(approved.status).toBe("approved");
    expect(state.balanceUpdates).toEqual([
      { availableMinor: 400, reservedMinor: 0, spentMinor: 600 },
    ]);
    expect(state.inventory).toEqual([
      expect.objectContaining({ idempotencyKey: `order:${orderId}:inventory:allocate:${productId}` }),
    ]);
    expect(state.ledger).toEqual([
      expect.objectContaining({ entryType: "order_capture", reversesEntryId: "reserve-ledger" }),
    ]);
    expect(state.effectOrder).toEqual(["inventory", "budget"]);

    state.order = orderRecord({ status: "approved" });
    state.balanceUpdates.length = 0;
    state.inventory.length = 0;
    state.ledger.length = 0;
    state.effectOrder.length = 0;
    state.captureLedger = { id: "capture-ledger" };
    state.account = accountRecord({ availableMinor: 400, spentMinor: 600 });

    const cancelled = await service.cancel(
      orderId,
      { reason: "Recovered items were returned to stock" },
      "operator-user",
    );

    expect(cancelled.status).toBe("cancelled");
    expect(state.balanceUpdates).toEqual([
      { availableMinor: 1000, reservedMinor: 0, spentMinor: 0 },
    ]);
    expect(state.inventory).toEqual([
      expect.objectContaining({ idempotencyKey: `order:${orderId}:inventory:return:${productId}` }),
    ]);
    expect(state.ledger).toEqual([
      expect.objectContaining({ entryType: "order_refund", reversesEntryId: "capture-ledger" }),
    ]);
    expect(state.effectOrder).toEqual(["inventory", "budget"]);
  });

  it("rejects forbidden state transitions without writing an order effect", async () => {
    const { service, state } = orderService({ status: "delivered" });

    await expect(service.approve(orderId, "operator-user")).rejects.toMatchObject({
      status: 409,
    });

    expect(state.balanceUpdates).toEqual([]);
    expect(state.inventory).toEqual([]);
    expect(state.ledger).toEqual([]);
  });
});

function orderService(options: {
  status?: "pending" | "approved" | "delivered";
  availableMinor?: number;
  reservedMinor?: number;
  reserveLedger?: { id: string };
  captureLedger?: { id: string };
  orderItems?: ReturnType<typeof orderItemRecord>[];
  reserveError?: boolean;
  existingSubmission?: boolean;
  serializeCart?: boolean;
  fundingActive?: boolean;
} = {}) {
  let createdSubmission = false;
  let cartLocked = false;
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
    createdItems: [] as Record<string, unknown>[],
    inventory: [] as Record<string, unknown>[],
    balanceUpdates: [] as Record<string, unknown>[],
    ledger: [] as Record<string, unknown>[],
    clearedCartIds: [] as string[],
    events: [] as Record<string, unknown>[],
    effectOrder: [] as Array<"inventory" | "budget">,
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
    listItems: async () => state.orderItems,
    listStatusEvents: async () => state.events,
    appendStatusEvent: async (input: Record<string, unknown>) => {
      state.events.push(input);
      return input;
    },
    lockById: async () => state.order,
    update: async (_id: string, input: Record<string, unknown>) => {
      state.order = orderRecord({ ...state.order, ...input });
      return state.order;
    },
  } as unknown as OrderRepository;
  const service = new OrderService(
    carts,
    orders,
    {
      findActiveById: async () => ({
        id: productId,
        name: "Rice 5kg current price",
        sku: "RICE-5KG",
        priceMinor: 300,
      }),
    } as unknown as ProductRepository,
    {
      reserve: async (input: Record<string, unknown>) => {
        if (options.reserveError) {
          throw { status: 409 };
        }
        state.effectOrder.push("inventory");
        state.inventory.push(input);
      },
      allocate: async (input: Record<string, unknown>) => {
        state.effectOrder.push("inventory");
        state.inventory.push(input);
      },
      release: async (input: Record<string, unknown>) => {
        state.effectOrder.push("inventory");
        state.inventory.push(input);
      },
      returnAllocated: async (input: Record<string, unknown>) => {
        state.effectOrder.push("inventory");
        state.inventory.push(input);
      },
    } as unknown as CatalogService,
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
    } as unknown as BudgetLedgerRepository,
    {
      findByAccountAndMonth: async () => null,
    } as unknown as MonthlyBudgetLimitRepository,
    { record: async () => undefined } as unknown as AuditService,
    { enqueue: async () => undefined } as unknown as OutboxService,
    {
      ensureFamily: async () => familyRecord(),
      ensureSameFamily: () => undefined,
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
    } as unknown as OrderValidator,
    {
      ensureOrderEligible: async () => {
        if (options.fundingActive === false) throw { status: 409 };
        return { status: "active" };
      },
    } as unknown as FundingService,
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
    familyProfileId: householdId,
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
    status: "pending",
    subtotalMinor: 600,
    totalMinor: 600,
    currency: "MAD",
    guardianLegalNameSnapshot: "Family guardian",
    deliveryAddressSnapshot: "Private address",
    deliveryPhoneSnapshot: "+212600000000",
    placedByUserId: "family-user",
    approvedByUserId: null,
    approvedAt: null,
    rejectedByUserId: null,
    rejectedAt: null,
    rejectionReason: null,
    cancelledByUserId: null,
    cancelledAt: null,
    cancellationReason: null,
    preparationStartedAt: null,
    deliveredAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
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
