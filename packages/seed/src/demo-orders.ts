import {
  auditEvents,
  budgetLedgerEntries,
  db,
  orderDeliveryAttempts,
  orderDeliveryIssues,
  orderItems,
  orderPurchaseRecords,
  orders,
  orderStatusEvents,
  outboxEvents,
  staffProfiles,
} from "@kafil/server/database";
import type {
  AssignDeliveryDto,
  AssistedOrderDto,
  ConfirmDeliveryDto,
  OrderReasonDto,
  RecordPurchaseDto,
  ReportDeliveryIssueDto,
} from "@kafil/server/modules";
import { and, asc, eq, inArray } from "drizzle-orm";

import type { DemoOrder } from "./scripts/demo/generator";
import { rebuildDemoBudgetSnapshots } from "./demo-budget";
import { isDemoOrderStatusCompatible } from "./demo-order-status";

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
  // The catalog service reports a result total alongside the rows, so the seed
  // reads the same page envelope every list endpoint now returns.
  listProducts(query: {
    limit: number;
    offset: number;
  }): Promise<{ data: DemoOrderProduct[] }>;
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
    data: AssignDeliveryDto,
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
  reportOwnDeliveryIssue(
    id: string,
    data: ReportDeliveryIssueDto,
    actorUserId: string,
  ): Promise<unknown>;
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

  const deliveryStaffRows = await db
    .select({
      affiliation: staffProfiles.affiliation,
      companyName: staffProfiles.companyName,
      id: staffProfiles.id,
      name: staffProfiles.name,
      phone: staffProfiles.phone,
      userId: staffProfiles.userId,
    })
    .from(staffProfiles)
    .where(inArray(staffProfiles.id, [...deliveryStaffIds]));
  const deliveryStaffById = new Map(
    deliveryStaffRows.map((staff) => [staff.id, staff]),
  );
  if (
    deliveryStaffById.size !== deliveryStaffIds.length ||
    deliveryStaffRows.some((staff) => !staff.userId)
  ) {
    throw new Error("Demo orders require linked users for every delivery staff fixture.");
  }

  const { data: products } = await services.catalog.listProducts({
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
    const deliveryStaffIndex = fixture.delivery?.staffIndex ?? index;
    const deliveryStaffId =
      deliveryStaffIds[deliveryStaffIndex % deliveryStaffIds.length]!;
    const deliveryStaff = deliveryStaffById.get(deliveryStaffId)!;
    const deliveryStaffUserId = deliveryStaff.userId!;
    const before = existingByKey.get(fixture.idempotencyKey);
    if (before && fixture.delivery) {
      await alignManagedDeliveryStaff(fixture, deliveryStaff);
    }
    const order = await seedDemoOrder(
      fixture,
      deliveryStaffId,
      actorUserId,
      productsBySku,
      services,
      index,
    );
    if (order.status === fixture.expectedStatus) {
      await alignDemoOrderTimeline(order.id, fixture);
      await ensureDemoDeliveryIssue(
        order.id,
        fixture,
        deliveryStaffId,
        deliveryStaffUserId,
        services.orders,
      );
    }

    if (!before) result.inserted += 1;
    else if (
      isDemoOrderStatusCompatible(before.status, fixture.expectedStatus)
    ) {
      result.skipped += 1;
    }
    else result.repaired += 1;
    logProgress(index + 1, fixtures.length);
  }

  await rebuildDemoBudgetSnapshots(
    [...new Set(fixtures.map((fixture) => fixture.familyProfileId))],
  );
  await verifyDemoOrders(fixtures);
  return result;
}

async function alignManagedDeliveryStaff(
  fixture: DemoOrder,
  staff: {
    affiliation: string;
    companyName: string | null;
    id: string;
    name: string;
    phone: string;
  },
) {
  await db
    .update(orderDeliveryAttempts)
    .set({
      affiliationSnapshot: staff.affiliation as "external" | "internal",
      companyNameSnapshot: staff.companyName,
      deliveryNameSnapshot: staff.name,
      deliveryPhoneSnapshot: staff.phone,
      staffProfileId: staff.id,
    })
    .where(
      eq(
        orderDeliveryAttempts.assignmentIdempotencyKey,
        `${fixture.idempotencyKey}:delivery:assign`,
      ),
    );
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

  if (
    order.status !== fixture.expectedStatus &&
    isDemoOrderStatusCompatible(order.status, fixture.expectedStatus)
  ) {
    return order;
  }

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
  if (!fixture.delivery) {
    throw new Error(
      `Demo order '${fixture.idempotencyKey}' is missing its delivery schedule.`,
    );
  }
  order = await services.orders.assignDelivery(
    order.id,
    {
      idempotencyKey: `${fixture.idempotencyKey}:delivery:assign`,
      packageCount: fixture.delivery.packageCount,
      scheduledDate: fixture.delivery.scheduledDate,
      staffProfileId: deliveryStaffId,
      windowEndMinute: fixture.delivery.windowEndMinute,
      windowStartMinute: fixture.delivery.windowStartMinute,
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

async function ensureDemoDeliveryIssue(
  orderId: string,
  fixture: DemoOrder,
  deliveryStaffId: string,
  deliveryStaffUserId: string,
  ordersService: DemoOrderService,
) {
  const issueKind = fixture.delivery?.issueKind;
  if (!issueKind) return;

  const [attempt] = await db
    .select({
      id: orderDeliveryAttempts.id,
      staffProfileId: orderDeliveryAttempts.staffProfileId,
    })
    .from(orderDeliveryAttempts)
    .where(
      eq(
        orderDeliveryAttempts.assignmentIdempotencyKey,
        `${fixture.idempotencyKey}:delivery:assign`,
      ),
    )
    .limit(1);
  if (!attempt || attempt.staffProfileId !== deliveryStaffId) {
    throw new Error(
      `Demo order '${fixture.idempotencyKey}' is missing its managed delivery attempt.`,
    );
  }

  await ordersService.reportOwnDeliveryIssue(
    orderId,
    {
      attemptId: attempt.id,
      idempotencyKey: `${fixture.idempotencyKey}:delivery:issue`,
      kind: issueKind,
      note: "Generated demo delivery attention case.",
    },
    deliveryStaffUserId,
  );
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
      ...(fixture.delivery
        ? {
            deliveryLatitudeSnapshot: fixture.delivery.latitude,
            deliveryLongitudeSnapshot: fixture.delivery.longitude,
          }
        : {}),
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
      ...(fixture.delivery
        ? {
            packageCount: fixture.delivery.packageCount,
            scheduledDate: fixture.delivery.scheduledDate,
            windowEndMinute: fixture.delivery.windowEndMinute,
            windowStartMinute: fixture.delivery.windowStartMinute,
          }
        : {}),
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

async function verifyDemoOrders(fixtures: readonly DemoOrder[]) {
  const rows = await db
    .select({
      deliveryLatitude: orders.deliveryLatitudeSnapshot,
      deliveryLongitude: orders.deliveryLongitudeSnapshot,
      familyProfileId: orders.familyProfileId,
      id: orders.id,
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
  const deliveryFixtures = fixtures.filter((fixture) => fixture.delivery);
  const attempts = deliveryFixtures.length
    ? await db
        .select({
          assignmentIdempotencyKey: orderDeliveryAttempts.assignmentIdempotencyKey,
          id: orderDeliveryAttempts.id,
          orderId: orderDeliveryAttempts.orderId,
          packageCount: orderDeliveryAttempts.packageCount,
          scheduledDate: orderDeliveryAttempts.scheduledDate,
          staffProfileId: orderDeliveryAttempts.staffProfileId,
          windowEndMinute: orderDeliveryAttempts.windowEndMinute,
          windowStartMinute: orderDeliveryAttempts.windowStartMinute,
        })
        .from(orderDeliveryAttempts)
        .where(
          inArray(
            orderDeliveryAttempts.assignmentIdempotencyKey,
            deliveryFixtures.map(
              (fixture) => `${fixture.idempotencyKey}:delivery:assign`,
            ),
          ),
        )
    : [];
  const attemptsByKey = new Map(
    attempts.map((attempt) => [attempt.assignmentIdempotencyKey, attempt]),
  );
  const issueFixtures = deliveryFixtures.filter(
    (fixture) => fixture.delivery?.issueKind,
  );
  const issues = issueFixtures.length
    ? await db
        .select({
          attemptId: orderDeliveryIssues.attemptId,
          kind: orderDeliveryIssues.kind,
          reportIdempotencyKey: orderDeliveryIssues.reportIdempotencyKey,
        })
        .from(orderDeliveryIssues)
        .where(
          inArray(
            orderDeliveryIssues.reportIdempotencyKey,
            issueFixtures.map(
              (fixture) => `${fixture.idempotencyKey}:delivery:issue`,
            ),
          ),
        )
    : [];
  const issuesByKey = new Map(
    issues.map((issue) => [issue.reportIdempotencyKey, issue]),
  );
  for (const fixture of fixtures) {
    const row = byKey.get(fixture.idempotencyKey);
    if (
      !row ||
      row.familyProfileId !== fixture.familyProfileId ||
      !isDemoOrderStatusCompatible(row.status, fixture.expectedStatus) ||
      row.placedAt.toISOString() !== fixture.placedAt
    ) {
      throw new Error(
        `Demo order '${fixture.idempotencyKey}' did not match its managed fixture.`,
      );
    }
    if (row.status !== fixture.expectedStatus || !fixture.delivery) continue;

    const attempt = attemptsByKey.get(
      `${fixture.idempotencyKey}:delivery:assign`,
    );
    if (
      !attempt ||
      attempt.orderId !== row.id ||
      attempt.scheduledDate !== fixture.delivery.scheduledDate ||
      attempt.windowStartMinute !== fixture.delivery.windowStartMinute ||
      attempt.windowEndMinute !== fixture.delivery.windowEndMinute ||
      attempt.packageCount !== fixture.delivery.packageCount ||
      row.deliveryLatitude !== fixture.delivery.latitude ||
      row.deliveryLongitude !== fixture.delivery.longitude
    ) {
      throw new Error(
        `Demo order '${fixture.idempotencyKey}' has an incorrect delivery fixture.`,
      );
    }
    if (fixture.delivery.issueKind) {
      const issue = issuesByKey.get(`${fixture.idempotencyKey}:delivery:issue`);
      if (!issue || issue.attemptId !== attempt.id || issue.kind !== fixture.delivery.issueKind) {
        throw new Error(
          `Demo order '${fixture.idempotencyKey}' is missing its delivery issue.`,
        );
      }
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
