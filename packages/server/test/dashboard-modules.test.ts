import { describe, expect, it } from "bun:test";
import { drizzle } from "drizzle-orm/node-postgres";
import { getMcpTools } from "najm-mcp";

import {
  DashboardController,
  DashboardRepository,
  DashboardService,
} from "../src/modules/dashboard";

describe("Phase 7 dashboard report boundaries", () => {
  it("exposes one read-only dashboard per product role", () => {
    expect(getMcpTools(DashboardController).map((tool) => tool.methodKey)).toEqual([
      "getOperator",
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
        status: "pending",
        totalMinor: "1800",
        placedAt: new Date("2026-07-20"),
      }],
    } as unknown as DashboardRepository);

    const result = await dashboard.getOperator();

    expect(result.counts).toMatchObject({ families: 3, activeFamilies: 2, openOrders: 2 });
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
      status: "pending",
      totalMinor: 1800,
      placedAt: new Date("2026-07-20"),
    }]);
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
