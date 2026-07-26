import { describe, expect, it } from "bun:test";
import { drizzle } from "drizzle-orm/node-postgres";
import { getMcpTools } from "najm-mcp";
import type { AuthService } from "najm-auth";
import type { UserService } from "najm-auth";
import pg from "pg";

import { AuditService } from "../src/modules/audit";
import { DashboardRepository, DashboardService } from "../src/modules/dashboard";
import { SponsorController, SponsorRepository, SponsorService, SponsorValidator } from "../src/modules/sponsors";

function makeSponsorValidator(sponsor?: Record<string, unknown>) {
  return {
    ensureExists: async () => sponsor ?? {
      id: "sponsor-1",
      name: "Sponsor One",
      email: "sponsor@example.test",
      image: null,
      status: "active",
      phone: "+212600000000",
      cin: "AB123456",
      gender: "M",
      address: "Casablanca",
      dateOfBirth: "1990-01-01",
      notes: "Test notes",
      createdAt: new Date("2025-01-15"),
    },
  } as unknown as SponsorValidator;
}

function makeDashboardService(metrics?: Record<string, unknown>) {
  return {
    getSponsorMetrics: async () => metrics ?? {
      counts: { activeSupportedFamilies: 2, activePlans: 1, pendingContributions: 0, supportedOrders: 3 },
      money: {
        validatedContributionMinor: 8000,
        pendingContributionMinor: 0,
        supportedAvailableMinor: 5000,
        supportedReservedMinor: 1000,
        supportedSpentMinor: 3000,
      },
      nextPlannedContribution: { planId: "plan-1", amountMinor: 500, dueAt: "2026-08-01" },
      contributionTrend: [],
      contributionStatuses: [],
      recentContributions: [],
      recentSupportedOrders: [],
      upcomingContributions: [],
    },
  } as unknown as DashboardService;
}

describe("Operator sponsor overview endpoint", () => {
  it("keeps plan and contribution summaries on family-target relationships", async () => {
    const database = drizzle(
      new pg.Pool({ connectionString: "postgresql://localhost/not-used" }),
    );
    const repository = new DashboardRepository();
    Object.assign(repository, { db: database });

    const planQuery = repository.sponsorPlanSummary("sponsor-1").toSQL();
    const contributionQuery = repository
      .sponsorContributionSummary("sponsor-1")
      .toSQL();

    expect(planQuery.sql).toContain('inner join "support_assignments"');
    expect(planQuery.sql).toContain('"support_assignments"."status" = ');
    expect(planQuery.sql).toContain('"support_assignments"."child_id" is null');
    expect(contributionQuery.sql).toContain('inner join "support_assignments"');
    expect(contributionQuery.sql).toContain('"support_assignments"."child_id" is null');
    expect(planQuery.params?.[0]).toBe("sponsor-1");
    expect(contributionQuery.params).toContain("sponsor-1");
    await database.$client.end();
  });

  it("exposes the overview as a read-only operator tool", () => {
    const tools = getMcpTools(SponsorController).map((tool) => tool.methodKey);
    expect(tools).toContain("getOverview");
  });

  it("merges the sponsor profile and dashboard metrics into one response", async () => {
    const service = new SponsorService(
      {} as unknown as AuthService,
      {} as unknown as UserService,
      {} as unknown as SponsorRepository,
      {} as unknown as AuditService,
      makeSponsorValidator({
        id: "sponsor-1",
        name: "Sponsor One",
        email: "sponsor@example.test",
        image: null,
        status: "active",
        phone: "+212600000000",
        cin: "AB123456",
        gender: "M",
        address: "Casablanca",
        dateOfBirth: "1990-01-01",
        notes: "Test notes",
        createdAt: new Date("2025-01-15"),
      }),
      makeDashboardService(),
    );

    const result = await service.getOverview("sponsor-1");

    expect(result.sponsor).toMatchObject({
      id: "sponsor-1",
      name: "Sponsor One",
      email: "sponsor@example.test",
      cin: "AB123456",
    });
    expect(result.metrics).toMatchObject({
      counts: { activeSupportedFamilies: 2 },
      money: { validatedContributionMinor: 8000 },
    });
  });

  it("propagates 404 when the sponsor does not exist", async () => {
    const service = new SponsorService(
      {} as unknown as AuthService,
      {} as unknown as UserService,
      {} as unknown as SponsorRepository,
      {} as unknown as AuditService,
      {
        ensureExists: async () => {
          throw { status: 404, message: "Sponsor not found" };
        },
      } as unknown as SponsorValidator,
      makeDashboardService(),
    );

    await expect(service.getOverview("unknown-id")).rejects.toMatchObject({ status: 404 });
  });

  it("does not leak password hashes, tokens, or auth secrets", async () => {
    const service = new SponsorService(
      {} as unknown as AuthService,
      {} as unknown as UserService,
      {} as unknown as SponsorRepository,
      {} as unknown as AuditService,
      makeSponsorValidator(),
      makeDashboardService(),
    );

    const result = await service.getOverview("sponsor-1");
    const json = JSON.stringify(result);

    expect(json).not.toContain("password");
    expect(json).not.toContain("token");
    expect(json).not.toContain("session");
    expect(json).not.toContain("guardian");
    expect(json).not.toContain("childName");
    expect(json).not.toContain("documents");
  });
});
