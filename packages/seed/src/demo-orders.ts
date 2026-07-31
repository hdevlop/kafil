import {
  auditEvents,
  budgetAccounts,
  budgetLedgerEntries,
  db,
  orderDeliveryAttempts,
  orderItems,
  orderPurchaseRecords,
  orders,
  orderStatusEvents,
  outboxEvents,
} from "@kafil/server/database";
import type {
  AssistedOrderDto,
  ConfirmDeliveryDto,
  OrderReasonDto,
  RecordPurchaseDto,
} from "@kafil/server/modules";
import { and, asc, eq, inArray } from "drizzle-orm";

import type { DemoOrder } from "./scripts/demo/generator";

interface DemoOrderProduct {
  id: string;
  sku: string;
}

interface DemoOrderRecord {
  id: string;
  status: string;
  totalMinor: number;
}

interface DemoOrderCatalogService {
  listProducts(query: {
    limit: number;
    offset: number;
  }): Promise<DemoOrderProduct[]>;
}

interface DemoOrderEvidenceService {
  read(
    kind: "receipts",
    fileName: string,
  ): Promise<{ bytes: Uint8Array; mediaType: string }>;
  upload(
    kind: "receipts",
    fileName: string,
    body: ArrayBuffer,
    contentType: string,
  ): Promise<{ byteSize: number; mediaType: string; path: string }>;
}

interface DemoOrderService {
  approve(id: string, actorUserId: string): Promise<DemoOrderRecord>;
  assignDelivery(
    id: string,
    data: { idempotencyKey: string; staffProfileId: string },
    actorUserId: string,
  ): Promise<DemoOrderRecord>;
  cancel(
    id: string,
    data: { confirmRecoverableGoods: boolean; reason: string },
    actorUserId: string,
  ): Promise<DemoOrderRecord>;
  confirmDelivery(
    id: string,
    data: ConfirmDeliveryDto,
    actorUserId: string,
  ): Promise<DemoOrderRecord>;
  recordPurchase(
    id: string,
    data: RecordPurchaseDto,
    actorUserId: string,
  ): Promise<DemoOrderRecord>;
  reject(
    id: string,
    data: OrderReasonDto,
    actorUserId: string,
  ): Promise<DemoOrderRecord>;
  startDelivery(
    id: string,
    data: { idempotencyKey: string },
    actorUserId: string,
  ): Promise<DemoOrderRecord>;
  submitAssisted(
    data: AssistedOrderDto,
    actorUserId: string,
  ): Promise<DemoOrderRecord>;
}

export interface DemoOrderSeedServices {
  catalog: DemoOrderCatalogService;
  evidence: DemoOrderEvidenceService;
  orders: DemoOrderService;
}

export interface DemoOrderSeedResult {
  inserted: number;
  repaired: number;
  skipped: number;
}

export async function seedDemoOrders(
  fixtures: readonly DemoOrder[],
  deliveryStaffIds: readonly string[],
  actorUserIds: readonly string[],
  fallbackActorUserId: string,
  services: DemoOrderSeedServices,
): Promise<DemoOrderSeedResult> {
  const result: DemoOrderSeedResult = {
    inserted: 0,
    repaired: 0,
    skipped: 0,
  };
  if (fixtures.length === 0) return result;
  if (deliveryStaffIds.length === 0) {
    throw new Error("Demo orders require at least one delivery staff fixture.");
  }

  const products = await services.catalog.listProducts({
    limit: 100,
    offset: 0,
  });
  const productsBySku = new Map(
    products.map((product) => [product.sku, product]),
  );
  const existing = await db
    .select({
      idempotencyKey: orders.submissionIdempotencyKey,
      status: orders.status,
    })
    .from(orders)
    .where(
      inArray(
        orders.submissionIdempotencyKey,
        fixtures.map((fixture) => fixture.idempotencyKey),
      ),
    );
  const existingByKey = new Map(
    existing.map((order) => [order.idempotencyKey, order]),
  );

  for (const [index, fixture] of fixtures.entries()) {
    const actorUserId =
      actorUserIds[index % actorUserIds.length] ?? fallbackActorUserId;
    const deliveryStaffId =
      deliveryStaffIds[index % deliveryStaffIds.length]!;
    const before = existingByKey.get(fixture.idempotencyKey);
    const order = await seedDemoOrder(
      fixture,
      deliveryStaffId,
      actorUserId,
      productsBySku,
      services,
      index,
    );
    await alignDemoOrderTimeline(order.id, fixture);

    if (!before) result.inserted += 1;
    else if (before.status === fixture.expectedStatus) result.skipped += 1;
    else result.repaired += 1;
    logProgress(index + 1, fixtures.length);
  }

  await rebuildDemoBudgetSnapshots(
    [...new Set(fixtures.map((fixture) => fixture.familyProfileId))],
  );
  await verifyDemoOrders(fixtures);
  return result;
}

async function seedDemoOrder(
  fixture: DemoOrder,
  deliveryStaffId: string,
  actorUserId: string,
  productsBySku: ReadonlyMap<string, DemoOrderProduct>,
  services: DemoOrderSeedServices,
  index: number,
) {
  const items = fixture.items.map((item) => {
    const product = productsBySku.get(item.sku);
    if (!product) {
      throw new Error(
        `Demo order '${fixture.idempotencyKey}' requires product '${item.sku}'.`,
      );
    }
    return { productId: product.id, quantity: item.quantity };
  });
  let order = await services.orders.submitAssisted(
    {
      familyProfileId: fixture.familyProfileId,
      items,
      assistanceChannel: fixture.assistanceChannel,
      assistanceNote: "Generated repeat-family demo order.",
      idempotencyKey: fixture.idempotencyKey,
    },
    actorUserId,
  );

  if (fixture.expectedStatus === "pending") {
    ensureStatus(order, ["pending"], fixture);
    return order;
  }
  if (fixture.expectedStatus === "rejected") {
    if (order.status === "pending") {
      order = await services.orders.reject(
        order.id,
        { reason: "Generated demo order was not approved." },
        actorUserId,
      );
    }
    ensureStatus(order, ["rejected"], fixture);
    return order;
  }
  if (fixture.expectedStatus === "cancelled") {
    if (order.status === "pending") {
      order = await services.orders.cancel(
        order.id,
        {
          confirmRecoverableGoods: false,
          reason: "Generated demo family request was cancelled.",
        },
        actorUserId,
      );
    }
    ensureStatus(order, ["cancelled"], fixture);
    return order;
  }

  if (order.status === "pending") {
    order = await services.orders.approve(order.id, actorUserId);
  }
  if (fixture.expectedStatus === "approved") {
    ensureStatus(order, ["approved"], fixture);
    return order;
  }

  const receipt = await ensureDemoReceipt(services.evidence, index);
  if (order.status === "approved") {
    order = await services.orders.recordPurchase(
      order.id,
      {
        actualTotalMinor: Math.max(1, order.totalMinor - (index % 3) * 100),
        confirmHigherAmount: false,
        idempotencyKey: `${fixture.idempotencyKey}:purchase`,
        merchantName: ["Marjane", "Carrefour Market", "Aswak Assalam"][
          index % 3
        ]!,
        purchasedAt: lifecycleDate(fixture.placedAt, 4),
        receiptByteSize: receipt.byteSize,
        receiptMediaType: "application/pdf",
        receiptNumber: `DEMO-${String(index + 1).padStart(5, "0")}`,
        receiptStoragePath: receipt.path,
      },
      actorUserId,
    );
  } else {
    await services.orders.recordPurchase(
      order.id,
      {
        actualTotalMinor: Math.max(1, order.totalMinor - (index % 3) * 100),
        confirmHigherAmount: false,
        idempotencyKey: `${fixture.idempotencyKey}:purchase`,
        merchantName: ["Marjane", "Carrefour Market", "Aswak Assalam"][
          index % 3
        ]!,
        purchasedAt: lifecycleDate(fixture.placedAt, 4),
        receiptByteSize: receipt.byteSize,
        receiptMediaType: "application/pdf",
        receiptNumber: `DEMO-${String(index + 1).padStart(5, "0")}`,
        receiptStoragePath: receipt.path,
      },
      actorUserId,
    );
  }
  order = await services.orders.assignDelivery(
    order.id,
    {
      idempotencyKey: `${fixture.idempotencyKey}:delivery:assign`,
      staffProfileId: deliveryStaffId,
    },
    actorUserId,
  );
  if (fixture.expectedStatus === "purchased") {
    ensureStatus(order, ["purchased"], fixture);
    return order;
  }

  order = await services.orders.startDelivery(
    order.id,
    { idempotencyKey: `${fixture.idempotencyKey}:delivery:start` },
    actorUserId,
  );
  if (fixture.expectedStatus === "out_for_delivery") {
    ensureStatus(order, ["out_for_delivery"], fixture);
    return order;
  }

  order = await services.orders.confirmDelivery(
    order.id,
    {
      confirmationMethod: "operator_confirmation",
      deliveryNote: "Delivered to the family in the generated demo history.",
      idempotencyKey: `${fixture.idempotencyKey}:delivery:confirm`,
    },
    actorUserId,
  );
  ensureStatus(order, ["delivered"], fixture);
  return order;
}

async function ensureDemoReceipt(
  evidence: DemoOrderEvidenceService,
  index: number,
) {
  const fileName = `00000000-0000-4000-8000-${String(501_000_000_001 + index).padStart(12, "0")}.pdf`;
  try {
    const stored = await evidence.read("receipts", fileName);
    return {
      byteSize: stored.bytes.byteLength,
      mediaType: stored.mediaType,
      path: `/api/order-evidence/receipts/serve/${fileName}`,
    };
  } catch (error) {
    if (
      !(error instanceof Error) ||
      !error.message.includes("Order evidence not found")
    ) {
      throw error;
    }
  }
  const bytes = new TextEncoder().encode(
    `%PDF-1.4\n% Kafil demo receipt ${index + 1}\n%%EOF\n`,
  );
  return evidence.upload(
    "receipts",
    fileName,
    bytes.buffer as ArrayBuffer,
    "application/pdf",
  );
}

async function alignDemoOrderTimeline(orderId: string, fixture: DemoOrder) {
  const placedAt = new Date(fixture.placedAt);
  const approvedAt = lifecycleDate(fixture.placedAt, 2);
  const purchasedAt = lifecycleDate(fixture.placedAt, 4);
  const assignedAt = lifecycleDate(fixture.placedAt, 5);
  const startedAt = lifecycleDate(fixture.placedAt, 6);
  const completedAt = lifecycleDate(fixture.placedAt, 8);
  const finalAt =
    fixture.expectedStatus === "pending"
      ? placedAt
      : fixture.expectedStatus === "approved"
        ? approvedAt
        : fixture.expectedStatus === "purchased"
          ? assignedAt
          : fixture.expectedStatus === "out_for_delivery"
            ? startedAt
            : fixture.expectedStatus === "delivered"
              ? completedAt
              : approvedAt;

  await db
    .update(orders)
    .set({
      createdAt: placedAt,
      updatedAt: finalAt,
      ...(isApprovedOrLater(fixture.expectedStatus) ? { approvedAt } : {}),
      ...(fixture.expectedStatus === "rejected"
        ? { rejectedAt: finalAt }
        : {}),
      ...(fixture.expectedStatus === "cancelled"
        ? { cancelledAt: finalAt }
        : {}),
      ...(fixture.expectedStatus === "out_for_delivery" ||
      fixture.expectedStatus === "delivered"
        ? { deliveryStartedAt: startedAt }
        : {}),
      ...(fixture.expectedStatus === "delivered"
        ? { deliveredAt: completedAt }
        : {}),
    })
    .where(eq(orders.id, orderId));
  await db
    .update(orderItems)
    .set({ createdAt: placedAt })
    .where(eq(orderItems.orderId, orderId));

  const events = await db
    .select({ id: orderStatusEvents.id, toStatus: orderStatusEvents.toStatus })
    .from(orderStatusEvents)
    .where(eq(orderStatusEvents.orderId, orderId))
    .orderBy(asc(orderStatusEvents.createdAt), asc(orderStatusEvents.id));
  for (const event of events) {
    await db
      .update(orderStatusEvents)
      .set({
        createdAt:
          event.toStatus === "pending"
            ? placedAt
            : event.toStatus === "approved" ||
                event.toStatus === "rejected" ||
                event.toStatus === "cancelled"
              ? approvedAt
              : event.toStatus === "purchased"
                ? purchasedAt
                : event.toStatus === "out_for_delivery"
                  ? startedAt
                  : completedAt,
      })
      .where(eq(orderStatusEvents.id, event.id));
  }

  const purchases = await db
    .select({ id: orderPurchaseRecords.id })
    .from(orderPurchaseRecords)
    .where(eq(orderPurchaseRecords.orderId, orderId));
  if (purchases.length > 0) {
    await db
      .update(orderPurchaseRecords)
      .set({ createdAt: purchasedAt, purchasedAt })
      .where(eq(orderPurchaseRecords.orderId, orderId));
  }
  await db
    .update(orderDeliveryAttempts)
    .set({
      assignedAt,
      createdAt: assignedAt,
      updatedAt: finalAt,
      ...(fixture.expectedStatus === "out_for_delivery" ||
      fixture.expectedStatus === "delivered"
        ? { startedAt }
        : {}),
      ...(fixture.expectedStatus === "delivered"
        ? { completedAt }
        : {}),
    })
    .where(eq(orderDeliveryAttempts.orderId, orderId));

  await db
    .update(budgetLedgerEntries)
    .set({ createdAt: placedAt })
    .where(
      and(
        eq(budgetLedgerEntries.sourceType, "order"),
        eq(budgetLedgerEntries.sourceId, orderId),
        eq(budgetLedgerEntries.entryType, "order_reserve"),
      ),
    );
  await db
    .update(budgetLedgerEntries)
    .set({ createdAt: finalAt })
    .where(
      and(
        eq(budgetLedgerEntries.sourceType, "order"),
        eq(budgetLedgerEntries.sourceId, orderId),
        eq(budgetLedgerEntries.entryType, "order_release"),
      ),
    );
  if (purchases.length > 0) {
    await db
      .update(budgetLedgerEntries)
      .set({ createdAt: purchasedAt })
      .where(
        and(
          eq(budgetLedgerEntries.sourceType, "order_purchase"),
          inArray(
            budgetLedgerEntries.sourceId,
            purchases.map((purchase) => purchase.id),
          ),
        ),
      );
  }
  await db
    .update(auditEvents)
    .set({ createdAt: placedAt })
    .where(
      and(
        eq(auditEvents.resource, "orders"),
        eq(auditEvents.resourceId, orderId),
      ),
    );
  await db
    .update(outboxEvents)
    .set({ availableAt: placedAt, createdAt: placedAt, updatedAt: finalAt })
    .where(
      and(
        eq(outboxEvents.aggregateType, "order"),
        eq(outboxEvents.aggregateId, orderId),
      ),
    );
}

async function rebuildDemoBudgetSnapshots(familyProfileIds: readonly string[]) {
  if (familyProfileIds.length === 0) return;
  await db.transaction(async (transaction) => {
    const accounts = await transaction
      .select({
        familyProfileId: budgetAccounts.familyProfileId,
        id: budgetAccounts.id,
      })
      .from(budgetAccounts)
      .where(inArray(budgetAccounts.familyProfileId, familyProfileIds))
      .for("update");

    for (const account of accounts) {
      const entries = await transaction
        .select()
        .from(budgetLedgerEntries)
        .where(eq(budgetLedgerEntries.budgetAccountId, account.id))
        .orderBy(asc(budgetLedgerEntries.createdAt), asc(budgetLedgerEntries.id))
        .for("update");
      let balance = {
        availableMinor: 0,
        reservedMinor: 0,
        spentMinor: 0,
      };
      for (const entry of entries) {
        balance = applyLedgerEntry(balance, entry);
        if (
          balance.availableMinor < 0 ||
          balance.reservedMinor < 0 ||
          balance.spentMinor < 0
        ) {
          throw new Error(
            `Demo order history would make family '${account.familyProfileId}' negative at ledger entry '${entry.id}'.`,
          );
        }
        await transaction
          .update(budgetLedgerEntries)
          .set({
            availableAfterMinor: balance.availableMinor,
            reservedAfterMinor: balance.reservedMinor,
            spentAfterMinor: balance.spentMinor,
          })
          .where(eq(budgetLedgerEntries.id, entry.id));
      }
      await transaction
        .update(budgetAccounts)
        .set({ ...balance, updatedAt: new Date() })
        .where(eq(budgetAccounts.id, account.id));
    }
  });
}

function applyLedgerEntry(
  balance: {
    availableMinor: number;
    reservedMinor: number;
    spentMinor: number;
  },
  entry: {
    amountMinor: number;
    entryType: string;
  },
) {
  const next = { ...balance };
  if (
    entry.entryType === "contribution_credit" ||
    entry.entryType === "contribution_refund" ||
    entry.entryType === "manual_credit" ||
    entry.entryType === "manual_debit"
  ) {
    next.availableMinor += entry.amountMinor;
  } else if (
    entry.entryType === "order_reserve" ||
    entry.entryType === "order_release"
  ) {
    next.availableMinor += entry.amountMinor;
    next.reservedMinor -= entry.amountMinor;
  } else if (entry.entryType === "order_capture") {
    next.reservedMinor += entry.amountMinor;
    next.spentMinor -= entry.amountMinor;
  } else if (entry.entryType === "order_refund") {
    next.availableMinor += entry.amountMinor;
    next.spentMinor -= entry.amountMinor;
  } else {
    throw new Error(`Unsupported budget ledger entry '${entry.entryType}'.`);
  }
  return next;
}

async function verifyDemoOrders(fixtures: readonly DemoOrder[]) {
  const rows = await db
    .select({
      familyProfileId: orders.familyProfileId,
      idempotencyKey: orders.submissionIdempotencyKey,
      placedAt: orders.createdAt,
      status: orders.status,
    })
    .from(orders)
    .where(
      inArray(
        orders.submissionIdempotencyKey,
        fixtures.map((fixture) => fixture.idempotencyKey),
      ),
    );
  const byKey = new Map(rows.map((row) => [row.idempotencyKey, row]));
  for (const fixture of fixtures) {
    const row = byKey.get(fixture.idempotencyKey);
    if (
      !row ||
      row.familyProfileId !== fixture.familyProfileId ||
      row.status !== fixture.expectedStatus ||
      row.placedAt.toISOString() !== fixture.placedAt
    ) {
      throw new Error(
        `Demo order '${fixture.idempotencyKey}' did not match its managed fixture.`,
      );
    }
  }
}

function isApprovedOrLater(status: DemoOrder["expectedStatus"]) {
  return (
    status === "approved" ||
    status === "purchased" ||
    status === "out_for_delivery" ||
    status === "delivered"
  );
}

function lifecycleDate(placedAt: string, hours: number) {
  return new Date(new Date(placedAt).getTime() + hours * 60 * 60 * 1_000);
}

function ensureStatus(
  order: DemoOrderRecord,
  expected: readonly string[],
  fixture: DemoOrder,
) {
  if (!expected.includes(order.status)) {
    throw new Error(
      `Demo order '${fixture.idempotencyKey}' is '${order.status}', expected '${fixture.expectedStatus}'.`,
    );
  }
}

function logProgress(processed: number, total: number) {
  if (processed === total || processed % 10 === 0) {
    console.log(`  orders: ${processed}/${total}`);
  }
}
