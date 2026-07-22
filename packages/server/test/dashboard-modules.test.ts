import { describe, expect, it } from "bun:test";
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
        inventory: { count: "1" },
      }),
      operatorContributionTrend: async () => [{ month: "2026-07", validatedMinor: "9000", refundedMinor: "500" }],
      operatorOrderStatuses: async () => [{ status: "pending", count: "2" }],
      operatorLowStock: async () => [{ productId: "product-1", name: "Shoes", sku: "SHOE-1", availableQuantity: "3" }],
    } as unknown as DashboardRepository);

    const result = await dashboard.getOperator();

    expect(result.counts).toMatchObject({ families: 3, activeFamilies: 2, lowStockProducts: 1 });
    expect(result.money.validatedContributionMinor).toBe(9000);
    expect(result.contributionTrend).toHaveLength(12);
    expect(result.contributionTrend.find((row) => row.month === "2026-07")).toEqual({
      month: "2026-07",
      validatedMinor: 9000,
      refundedMinor: 500,
    });
  });

  it("keeps the sponsor dashboard privacy-safe while aggregating supported budgets", async () => {
    const dashboard = new DashboardService({
      sponsorIdentity: async () => ({ id: "sponsor-profile", displayName: "Sponsor One" }),
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
    } as unknown as DashboardRepository);

    const result = await dashboard.getSponsor("sponsor-user");

    expect(result).toMatchObject({
      displayName: "Sponsor One",
      counts: { activeAssignments: 2, supportedOrders: 3 },
      money: { supportedAvailableMinor: 5000, supportedSpentMinor: 3000 },
    });
    expect(JSON.stringify(result)).not.toContain("private-household-id");
  });
});
