import { describe, expect, it } from "bun:test";
import { drizzle } from "drizzle-orm/node-postgres";
import { getMcpTools } from "najm-mcp";

import {
  DashboardController,
  DashboardRepository,
  DashboardService,
  deliveryFamiliesQuery,
} from "../src/modules/dashboard";

describe("Phase 7 dashboard report boundaries", () => {
  it("exposes one read-only dashboard per product role", () => {
    expect(getMcpTools(DashboardController).map((tool) => tool.methodKey)).toEqual([
      "getOperator",
      "getDelivery",
      "getDeliveryFamilies",
      "getFamily",
      "getSponsor",
    ]);
  });

  it("fills missing operator trend months and normalizes database numerics", async () => {
    const dashboard = new DashboardService({
      operatorPeopleCounts: async () => ({
        families: { total: "3", active: "2" },
        children: { total: "5", active: "4" },
        sponsors: { total: "4", active: "3" },
        assignments: { active: "2" },
      }),
      operatorMoneyCounts: async () => ({
        contributions: { pendingCount: "1", pendingMinor: "1500", validatedMinor: "9000", refundedMinor: "500" },
        budgets: { availableMinor: "6000", reservedMinor: "1000", spentMinor: "2500" },
        orders: { openCount: "2" },
      }),
      operatorContributionTrend: async () => [{ month: "2026-07", validatedMinor: "9000", refundedMinor: "500" }],
      operatorOrderStatuses: async () => [{ status: "pending", count: "2" }],
      operatorRecentOrders: async () => [{
        id: "order-1",
        orderNumber: "ORD-001",
        familyName: "Atlas Family",
        familyImage: null,
        status: "pending",
        totalMinor: "1800",
        placedAt: new Date("2026-07-20"),
      }],
      operatorPendingApplicants: async () => [{ count: "4" }],
      operatorFamiliesWithoutSponsorship: async () => [{ count: "2" }],
    } as unknown as DashboardRepository);

    const result = await dashboard.getOperator();

    expect(result.counts).toMatchObject({ families: 3, activeFamilies: 2, openOrders: 2, pendingApplicants: 4, familiesWithoutSponsorship: 2 });
    expect(result.money.validatedContributionMinor).toBe(9000);
    expect(result.contributionTrend).toHaveLength(12);
    expect(result.contributionTrend.find((row) => row.month === "2026-07")).toEqual({
      month: "2026-07",
      validatedMinor: 9000,
      refundedMinor: 500,
    });
    expect(result.recentOrders).toEqual([{
      id: "order-1",
      orderNumber: "ORD-001",
      familyName: "Atlas Family",
      familyImage: null,
      status: "pending",
      totalMinor: 1800,
      placedAt: new Date("2026-07-20"),
    }]);
  });

  it("derives one mutually exclusive delivery projection from the selected staff day", async () => {
    const dashboard = new DashboardService({
      deliveryStaffIdentity: async () => ({ id: "staff-1", name: "Courier", status: "active" }),
      deliveryRows: async () => [
        {
          attemptId: "attempt-1", attemptStatus: "assigned", orderId: "order-1", orderNumber: "KAF-1",
          orderStatus: "purchased", familyProfileId: "family-1", familyName: "Atlas Family", familyImage: null,
          address: "Address 1", phone: "+212600000001", latitude: 33.57, longitude: -7.59,
          scheduledDate: "2026-09-09", windowStartMinute: 14 * 60, windowEndMinute: 15 * 60, packageCount: 2,
        },
        {
          attemptId: "attempt-2", attemptStatus: "delivered", orderId: "order-2", orderNumber: "KAF-2",
          orderStatus: "delivered", familyProfileId: "family-1", familyName: "Atlas Family", familyImage: null,
          address: "Address 1", phone: null, latitude: null, longitude: null,
          scheduledDate: "2026-09-09", windowStartMinute: 15 * 60, windowEndMinute: 16 * 60, packageCount: 4,
        },
        {
          attemptId: "attempt-3", attemptStatus: "failed", orderId: "order-3", orderNumber: "KAF-3",
          orderStatus: "purchased", familyProfileId: "family-2", familyName: "Rif Family", familyImage: null,
          address: "Address 2", phone: null, latitude: null, longitude: null,
          scheduledDate: "2026-09-09", windowStartMinute: null, windowEndMinute: null, packageCount: 3,
        },
      ],
      openDeliveryIssues: async () => [{
        id: "issue-1", attemptId: "attempt-1", kind: "address_confirmation", note: null,
      }],
    } as unknown as DashboardRepository);

    const result = await dashboard.getDelivery(
      "operator-user",
      "2026-09-09",
      new Date("2026-09-09T15:30:00.000Z"),
    );

    expect(result.counts).toEqual({
      assigned: 3, pending: 0, delivered: 1, needsAttention: 2,
      families: 2, packagesRemaining: 5,
    });
    expect(result.counts.assigned).toBe(
      result.counts.pending + result.counts.delivered + result.counts.needsAttention,
    );
    expect(result.deliveries[0]).toMatchObject({
      category: "needs_attention", delayed: true,
      coordinates: { latitude: 33.57, longitude: -7.59 }, canStart: true,
    });
    expect(result.deliveries[1]).toMatchObject({ category: "delivered", coordinates: null, canConfirm: false });
  });

  it("derives workflow state and canPurchase independently of the warning category", async () => {
    const row = (overrides: Record<string, unknown>) => ({
      attemptId: "attempt-1", attemptStatus: "assigned", orderId: "order-1", orderNumber: "KAF-1",
      orderStatus: "approved", familyProfileId: "family-1", familyName: "Atlas Family", familyImage: null,
      address: "Address 1", phone: null, latitude: null, longitude: null,
      scheduledDate: "2026-09-09", windowStartMinute: null, windowEndMinute: null, packageCount: 1,
      hasActivePurchase: false,
      ...overrides,
    });
    const service = (rows: Array<Record<string, unknown>>, issues: Array<Record<string, unknown>> = []) =>
      new DashboardService({
        deliveryStaffIdentity: async () => ({ id: "staff-1", name: "Courier", status: "active" }),
        deliveryRows: async () => rows,
        openDeliveryIssues: async () => issues,
      } as unknown as DashboardRepository);
    const first = async (rows: Array<Record<string, unknown>>, issues: Array<Record<string, unknown>> = []) =>
      (await service(rows, issues).getDelivery(
        "delivery-user",
        "2026-09-09",
        new Date("2026-09-09T09:00:00.000Z"),
      )).deliveries[0];

    expect(await first([row({ orderStatus: "pending" })])).toMatchObject({
      workflowState: "waiting_approval", canPurchase: false, canStart: false, canConfirm: false,
    });
    expect(await first([row({})])).toMatchObject({
      workflowState: "purchase_required", canPurchase: true, canStart: false,
    });
    expect(await first([row({ orderStatus: "purchased" })])).toMatchObject({
      workflowState: "ready_for_delivery", canPurchase: false, canStart: true,
    });
    expect(await first([row({ attemptStatus: "in_progress", orderStatus: "out_for_delivery" })])).toMatchObject({
      workflowState: "out_for_delivery", canPurchase: false, canStart: false, canConfirm: true,
    });
    expect(await first([row({ attemptStatus: "delivered", orderStatus: "delivered" })])).toMatchObject({
      workflowState: "delivered", canPurchase: false, canConfirm: false, canReportIssue: false,
    });
    expect(await first([row({ attemptStatus: "failed", orderStatus: "purchased" })])).toMatchObject({
      workflowState: "needs_operator_action", canPurchase: false, canStart: false, canConfirm: false,
    });

    // An already-settled approved order never re-offers the purchase action.
    expect(await first([row({ hasActivePurchase: true })])).toMatchObject({
      workflowState: "needs_operator_action", canPurchase: false,
    });

    // Warning state and workflow state are independent signals.
    const flagged = await first(
      [row({})],
      [{ id: "issue-1", attemptId: "attempt-1", kind: "address_confirmation", note: null }],
    );
    expect(flagged).toMatchObject({
      category: "needs_attention",
      workflowState: "purchase_required",
      canPurchase: true,
    });
    expect(flagged.openIssues).toEqual([
      { id: "issue-1", kind: "address_confirmation", note: null },
    ]);
  });

  it("groups one selected-date directory entry per family with distinct order counts", async () => {
    const dashboard = new DashboardService({
      deliveryStaffIdentity: async () => ({ id: "staff-1", name: "Courier", status: "active" }),
      deliveryRows: async () => [
        {
          attemptId: "attempt-1", attemptStatus: "assigned", orderId: "order-1", orderNumber: "KAF-2",
          orderStatus: "purchased", familyProfileId: "family-1", familyName: "Atlas Family", familyImage: null,
          address: "Second address", phone: "+212600000002", latitude: 33.58, longitude: -7.6,
          scheduledDate: "2026-09-09", windowStartMinute: 15 * 60, windowEndMinute: 16 * 60, packageCount: 2,
        },
        {
          attemptId: "attempt-2", attemptStatus: "assigned", orderId: "order-2", orderNumber: "KAF-1",
          orderStatus: "purchased", familyProfileId: "family-1", familyName: "Atlas Family", familyImage: "img.webp",
          address: "First address", phone: "+212600000001", latitude: 33.57, longitude: -7.59,
          scheduledDate: "2026-09-09", windowStartMinute: 14 * 60, windowEndMinute: 15 * 60, packageCount: 1,
        },
        {
          attemptId: "attempt-3", attemptStatus: "delivered", orderId: "order-3", orderNumber: "KAF-3",
          orderStatus: "delivered", familyProfileId: "family-2", familyName: "Rif Family", familyImage: null,
          address: "Address 2", phone: null, latitude: null, longitude: null,
          scheduledDate: "2026-09-09", windowStartMinute: null, windowEndMinute: null, packageCount: 3,
        },
      ],
      openDeliveryIssues: async () => [
        { id: "issue-1", attemptId: "attempt-1", kind: "family_unreachable", note: null },
        { id: "issue-2", attemptId: "attempt-1", kind: "missing_proof", note: null },
      ],
    } as unknown as DashboardRepository);

    const result = await dashboard.getDeliveryFamilies(
      "delivery-user",
      { date: "2026-09-09" },
      new Date("2026-09-09T10:00:00.000Z"),
    );

    expect(result.pagination.total).toBe(2);
    // Two issues on one attempt flag the family once without multiplying orders.
    expect(result.data[0]).toMatchObject({
      familyProfileId: "family-1",
      familyName: "Atlas Family",
      status: "needs_attention",
      orderCount: 2,
      pending: 1,
      delivered: 0,
      needsAttention: 1,
      // Deterministic snapshot: earliest window wins even though its order
      // number sorts later.
      phone: "+212600000001",
      address: "First address",
      coordinates: { latitude: 33.57, longitude: -7.59 },
      nextWindowStartMinute: 14 * 60,
      nextWindowEndMinute: 15 * 60,
    });
    expect(result.data[1]).toMatchObject({
      familyProfileId: "family-2",
      status: "delivered",
      orderCount: 1,
      phone: null,
      coordinates: null,
      nextWindowStartMinute: null,
    });
    const json = JSON.stringify(result);
    expect(json).not.toContain("guardian");
    expect(json).not.toContain("cin");
    expect(json).not.toContain("documents");
    expect(json).not.toContain("notes");
  });

  it("searches, orders stably, and paginates the delivery families directory", async () => {
    const rows = (name: string, profile: string, phone: string | null, window: number | null) => ({
      attemptId: `attempt-${profile}`, attemptStatus: "assigned", orderId: `order-${profile}`,
      orderNumber: `KAF-${profile}`, orderStatus: "purchased", familyProfileId: profile,
      familyName: name, familyImage: null, address: `${name} address`, phone,
      latitude: null, longitude: null, scheduledDate: "2026-09-09",
      windowStartMinute: window, windowEndMinute: window == null ? null : window + 60, packageCount: 1,
    });
    const dashboard = new DashboardService({
      deliveryStaffIdentity: async () => ({ id: "staff-1", name: "Courier", status: "active" }),
      deliveryRows: async () => [
        rows("Zulu Family", "family-3", "+212600000003", null),
        rows("Atlas Family", "family-1", "+212600000001", 14 * 60),
        rows("Rif Household", "family-2", "+212600000002", 9 * 60),
      ],
      openDeliveryIssues: async () => [],
    } as unknown as DashboardRepository);

    const searched = await dashboard.getDeliveryFamilies(
      "delivery-user",
      { date: "2026-09-09", search: "atlas" },
      new Date("2026-09-09T10:00:00.000Z"),
    );
    expect(searched.pagination.total).toBe(1);
    expect(searched.data.map((entry) => entry.familyName)).toEqual(["Atlas Family"]);

    const byPhone = await dashboard.getDeliveryFamilies(
      "delivery-user",
      { date: "2026-09-09", search: "0000002" },
      new Date("2026-09-09T10:00:00.000Z"),
    );
    expect(byPhone.data.map((entry) => entry.familyName)).toEqual(["Rif Household"]);

    const first = await dashboard.getDeliveryFamilies(
      "delivery-user",
      { date: "2026-09-09", limit: 2, offset: 0 },
      new Date("2026-09-09T10:00:00.000Z"),
    );
    // Earliest window first; families without a window sort last.
    expect(first.data.map((entry) => entry.familyName)).toEqual(["Rif Household", "Atlas Family"]);
    expect(first.pagination).toMatchObject({ total: 3, page: 1, limit: 2 });

    const second = await dashboard.getDeliveryFamilies(
      "delivery-user",
      { date: "2026-09-09", limit: 2, offset: 2 },
      new Date("2026-09-09T10:00:00.000Z"),
    );
    expect(second.data.map((entry) => entry.familyName)).toEqual(["Zulu Family"]);
    expect(second.pagination).toMatchObject({ total: 3, page: 2, limit: 2 });
  });

  it("denies the delivery families directory without an active delivery staff identity", async () => {
    const dashboard = new DashboardService({
      deliveryStaffIdentity: async () => undefined,
      deliveryRows: async () => {
        throw new Error("must not query without staff identity");
      },
      openDeliveryIssues: async () => {
        throw new Error("must not query without staff identity");
      },
    } as unknown as DashboardRepository);

    await expect(
      dashboard.getDeliveryFamilies("operator-user", { date: "2026-09-09" }),
    ).rejects.toThrow();
  });

  it("validates the delivery families query boundaries", () => {
    expect(() =>
      deliveryFamiliesQuery.parse({ date: "not-a-date" }),
    ).toThrow();
    expect(deliveryFamiliesQuery.parse({ date: "2026-09-09" })).toMatchObject({
      limit: 50,
      offset: 0,
    });
    expect(
      deliveryFamiliesQuery.parse({ date: "2026-09-09", limit: "25", offset: "50" }),
    ).toMatchObject({ limit: 25, offset: 50 });
  });

  it("returns the dominant category projection for each family recent order", async () => {
    const dashboard = new DashboardService({
      familyIdentity: async () => ({ familyProfileId: "family-1", displayName: "Atlas Family" }),
      familySummary: async () => ({
        children: { total: 1, active: 1 },
        budget: { availableMinor: 5000, reservedMinor: 0, spentMinor: 1000 },
        orders: { open: 0, delivered: 1 },
      }),
      familyOrderTrend: async () => [],
      familyOrderStatuses: async () => [{ status: "delivered", count: 1 }],
      familyRecentOrders: async () => [{
        id: "order-1",
        orderNumber: "ORD-001",
        status: "delivered",
        totalMinor: "1000",
        placedAt: new Date("2026-07-20"),
        dominantCategoryName: "Fresh Produce",
        dominantCategoryImage: "/api/category-images/files/serve/fresh-produce.webp",
      }],
      familyRecentSponsorContributions: async () => [{
        id: "contribution-1",
        name: "Sponsor One",
        image: null,
        gender: "F",
        status: "pending",
        amountMinor: "700000",
        submittedAt: new Date("2026-07-10"),
        paidAt: null,
      }],
    } as unknown as DashboardRepository);

    const result = await dashboard.getFamily("family-user");

    expect(result.recentOrders).toEqual([{
      id: "order-1",
      orderNumber: "ORD-001",
      status: "delivered",
      totalMinor: 1000,
      placedAt: new Date("2026-07-20"),
      dominantCategoryName: "Fresh Produce",
      dominantCategoryImage: "/api/category-images/files/serve/fresh-produce.webp",
    }]);
    expect(result.recentSponsorContributions).toEqual([{
      id: "contribution-1",
      name: "Sponsor One",
      image: null,
      gender: "F",
      status: "pending",
      amountMinor: 700000,
      submittedAt: new Date("2026-07-10"),
      paidAt: null,
    }]);
  });

  it("returns the family's latest sponsor contributions with their statuses", () => {
    const repository = new DashboardRepository();
    (repository as unknown as { db: ReturnType<typeof drizzle.mock> }).db = drizzle.mock();

    const query = repository.familyRecentSponsorContributions(
      "00000000-0000-4000-8000-000000000001",
    ).toSQL();

    expect(query.sql).toContain('"contributions"."family_profile_id" = $1');
    expect(query.sql).toContain('"contributions"."status"');
    expect(query.sql).toContain('"contributions"."amount_minor"');
    expect(query.sql).toContain('order by "contributions"."submitted_at" desc');
    expect(query.params).toEqual([
      "00000000-0000-4000-8000-000000000001",
      4,
    ]);
  });

  it("counts only applicants pending review for the operator dashboard", () => {
    const repository = new DashboardRepository();
    (repository as unknown as { db: ReturnType<typeof drizzle.mock> }).db = drizzle.mock();

    const query = repository.operatorPendingApplicants().toSQL();

    expect(query.sql).toContain('count(*)::int');
    expect(query.sql).toContain('from "applicants"');
    expect(query.sql).toContain('"applicants"."status" = $1');
    expect(query.params).toEqual(["pending_review"]);
  });

  it("counts families without active sponsorship via left-join and is-null filter", () => {
    const repository = new DashboardRepository();
    (repository as unknown as { db: ReturnType<typeof drizzle.mock> }).db = drizzle.mock();

    const query = repository.operatorFamiliesWithoutSponsorship().toSQL();

    expect(query.sql).toContain('count(*)::int');
    expect(query.sql).toContain('from "family_profiles"');
    expect(query.sql).toContain('left join "support_assignments"');
    expect(query.sql).toContain(
      '"support_assignments"."family_profile_id" = "family_profiles"."id"',
    );
    expect(query.sql).toContain('"support_assignments"."status" = $1');
    expect(query.sql).toContain('"support_assignments"."id" is null');
    expect(query.params).toEqual(["active"]);
  });

  it("defaults both new counts to zero when the underlying queries return empty rows", async () => {
    const dashboard = new DashboardService({
      operatorPeopleCounts: async () => ({
        families: { total: "0", active: "0" },
        children: { total: "0", active: "0" },
        sponsors: { total: "0", active: "0" },
        assignments: { active: "0" },
      }),
      operatorMoneyCounts: async () => ({
        contributions: { pendingCount: "0", pendingMinor: "0", validatedMinor: "0", refundedMinor: "0" },
        budgets: { availableMinor: "0", reservedMinor: "0", spentMinor: "0" },
        orders: { openCount: "0" },
      }),
      operatorContributionTrend: async () => [],
      operatorOrderStatuses: async () => [],
      operatorRecentOrders: async () => [],
      operatorPendingApplicants: async () => [],
      operatorFamiliesWithoutSponsorship: async () => [],
    } as unknown as DashboardRepository);

    const result = await dashboard.getOperator();

    expect(result.counts).toMatchObject({
      pendingApplicants: 0,
      familiesWithoutSponsorship: 0,
    });
  });

  it("qualifies every dominant-category subquery column", () => {
    const repository = new DashboardRepository();
    (repository as unknown as { db: ReturnType<typeof drizzle.mock> }).db = drizzle.mock();

    const query = repository.familyRecentOrders(
      "00000000-0000-4000-8000-000000000001",
    ).toSQL();

    expect(query.sql).toContain(
      'dominant_products."id" = dominant_order_items."product_id"',
    );
    expect(query.sql).toContain(
      'dominant_order_items."order_id" = "orders"."id"',
    );
    expect(query.sql).toContain('SUM(dominant_order_items."quantity") DESC');
    expect(query.sql).toContain('MIN(dominant_order_items."created_at") ASC');
    expect(query.params).toContain(4);
  });

  it("keeps the sponsor dashboard privacy-safe while aggregating supported budgets", async () => {
    const dashboard = new DashboardService({
      sponsorIdentity: async () => ({ id: "sponsor-profile", displayName: "Sponsor One", createdAt: new Date("2025-01-15") }),
      sponsorSummary: async () => ({
        assignments: { active: 2 },
        plans: { active: 1 },
        contributions: { pendingCount: 1, pendingMinor: 2000, validatedMinor: 8000 },
        orders: { count: 3 },
      }),
      sponsorBudgetRows: async () => [{
        familyProfileId: "private-household-id",
        availableMinor: 5000,
        reservedMinor: 1000,
        spentMinor: 3000,
      }],
      sponsorContributionTrend: async () => [],
      sponsorContributionStatuses: async () => [{ status: "validated", count: 2 }],
      sponsorRecentContributions: async () => [],
      sponsorSupportedFamilies: async () => [{
        familyProfileId: "private-household-id",
        familyName: "Family Atlas",
        image: "/api/family-images/files/serve/family-demo.webp",
        activeChildCount: 3,
        startedAt: new Date("2025-06-01"),
        fundingTargetMinor: 10000,
        fundingStatus: "active",
        fundingActivatedAt: new Date("2025-07-01"),
        fundedMinor: 7500,
      }],
      sponsorEarliestPlan: async () => [{
        planId: "plan-1",
        amountMinor: 500,
        dueAt: new Date("2026-08-01"),
      }],
      sponsorUpcomingPlans: async () => [{
        planId: "plan-1",
        amountMinor: 500,
        dueAt: new Date("2026-08-01"),
        assignmentId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      }],
      sponsorRecentSupportedOrders: async () => [{
        id: "order-1",
        orderNumber: "ORD-001",
        status: "delivered",
        totalMinor: 1500,
        placedAt: new Date("2026-07-20"),
        itemCount: 2,
      }],
    } as unknown as DashboardRepository);

    const result = await dashboard.getSponsor("sponsor-user");

    expect(result).toMatchObject({
      displayName: "Sponsor One",
      counts: { activeSupportedFamilies: 2, supportedOrders: 3 },
      money: { supportedAvailableMinor: 5000, supportedSpentMinor: 3000 },
    });
    expect(result.memberSince).toBeTruthy();
    expect(result.nextPlannedContribution).toMatchObject({ planId: "plan-1", amountMinor: 500 });
      expect(result.supportedFamilies).toHaveLength(1);
      expect(result.supportedFamilies[0]).toMatchObject({
        familyName: "Family Atlas",
        familyReference: "KF-SEHOLDID",
      });
    expect(result.supportedFamilies[0].image).toBe(
      "/api/family-images/files/serve/family-demo.webp",
    );
    expect(result.supportedFamilies[0].funding).toMatchObject({
      targetMinor: 10000,
      fundedMinor: 7500,
      remainingMinor: 2500,
      status: "active",
    });
    expect(result.supportedFamilies[0].funding?.activatedAt).toBeTruthy();
    expect(result.recentSupportedOrders).toHaveLength(1);
    expect(result.upcomingContributions).toHaveLength(1);
    expect(JSON.stringify(result)).not.toContain("private-household-id");
  });

  it("returns null funding when funding target is zero", async () => {
    const dashboard = new DashboardService({
      sponsorIdentity: async () => ({ id: "sponsor-profile", displayName: "Sponsor One", createdAt: new Date("2025-01-15") }),
      sponsorSummary: async () => ({
        assignments: { active: 0 },
        plans: { active: 0 },
        contributions: { pendingCount: 0, pendingMinor: 0, validatedMinor: 0 },
        orders: { count: 0 },
      }),
      sponsorBudgetRows: async () => [],
      sponsorContributionTrend: async () => [],
      sponsorContributionStatuses: async () => [],
      sponsorRecentContributions: async () => [],
      sponsorSupportedFamilies: async () => [{
        familyProfileId: "household-1",
        familyName: "Family One",
        image: null,
        activeChildCount: 0,
        startedAt: new Date("2025-06-01"),
        fundingTargetMinor: 0,
        fundingStatus: "pending_funding",
        fundingActivatedAt: null,
        fundedMinor: 0,
      }],
      sponsorEarliestPlan: async () => [],
      sponsorUpcomingPlans: async () => [],
      sponsorRecentSupportedOrders: async () => [],
    } as unknown as DashboardRepository);

    const result = await dashboard.getSponsor("sponsor-user");

    expect(result.supportedFamilies).toHaveLength(1);
    expect(result.supportedFamilies[0].funding).toBeNull();
    expect(result.nextPlannedContribution).toBeNull();
    expect(result.upcomingContributions).toHaveLength(0);
    expect(result.recentSupportedOrders).toHaveLength(0);
  });

  it("includes the privacy-safe family name while excluding sensitive identity fields", async () => {
    const dashboard = new DashboardService({
      sponsorIdentity: async () => ({ id: "sponsor-profile", displayName: "Sponsor One", createdAt: new Date("2025-01-15") }),
      sponsorSummary: async () => ({
        assignments: { active: 1 },
        plans: { active: 0 },
        contributions: { pendingCount: 0, pendingMinor: 0, validatedMinor: 0 },
        orders: { count: 0 },
      }),
      sponsorBudgetRows: async () => [],
      sponsorContributionTrend: async () => [],
      sponsorContributionStatuses: async () => [],
      sponsorRecentContributions: async () => [],
      sponsorSupportedFamilies: async () => [{
        familyProfileId: "household-1",
        familyName: "Family One",
        image: null,
        activeChildCount: 2,
        startedAt: new Date("2025-06-01"),
        fundingTargetMinor: 5000,
        fundingStatus: "active",
        fundingActivatedAt: new Date("2025-07-01"),
        fundedMinor: 5000,
      }],
      sponsorEarliestPlan: async () => [],
      sponsorUpcomingPlans: async () => [],
      sponsorRecentSupportedOrders: async () => [],
    } as unknown as DashboardRepository);

    const result = await dashboard.getSponsor("sponsor-user");
    const json = JSON.stringify(result);

    expect(json).not.toContain("guardian");
    expect(json).not.toContain("cin");
    expect(json).not.toContain("address");
    expect(json).not.toContain("documents");
     expect(json).not.toContain("notes");
     expect(json).not.toContain("housingSituation");
     expect(json).not.toContain("registrationDate");
     expect(json).not.toContain("supportPriority");
     expect(json).not.toContain("childName");
    expect(result.supportedFamilies[0]?.familyName).toBe("Family One");
  });
});
