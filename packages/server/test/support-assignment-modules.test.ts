import { describe, expect, it } from "bun:test";
import { getMcpTools } from "najm-mcp";
import { getValidationConfig } from "najm-validation";

import { AuditService } from "../src/modules/audit";
import {
  createSupportAssignmentDto,
  endSupportAssignmentDto,
  ownSupportAssignmentListQuery,
  SupportAssignmentController,
  SupportAssignmentRepository,
  SupportAssignmentService,
  SupportAssignmentValidator,
  supportAssignmentIdParams,
  supportAssignmentListQuery,
  selectSponsorFamilyDto,
  sponsorFamilyCatalogQuery,
  updateSupportAssignmentNotesDto,
} from "../src/modules/supportAssignments";

const assignmentId = "00000000-0000-4000-8000-000000000040";
const sponsorProfileId = "00000000-0000-4000-8000-000000000041";
const householdId = "00000000-0000-4000-8000-000000000042";
const childId = "00000000-0000-4000-8000-000000000043";

describe("Phase 2 support assignment route boundaries", () => {
  it("keeps relationship status and audit identity out of caller input", () => {
    const parsed = createSupportAssignmentDto.parse({
      sponsorProfileId,
      familyProfileId: householdId,
      notes: "Operator context",
      status: "ended",
      assignedByUserId: "attacker",
      endedAt: "2026-07-16T00:00:00.000Z",
    });

    expect(parsed).toEqual({
      sponsorProfileId,
      familyProfileId: householdId,
      notes: "Operator context",
    });
    expect(
      createSupportAssignmentDto.safeParse({
        sponsorProfileId,
        familyProfileId: householdId,
        childId,
      }).success,
    ).toBe(false);
    expect(selectSponsorFamilyDto.parse({ familyProfileId: householdId })).toEqual({
      familyProfileId: householdId,
    });
    expect(endSupportAssignmentDto.safeParse({ reason: "x" }).success).toBe(
      false,
    );
    expect(
      updateSupportAssignmentNotesDto.parse({ notes: "  Operator context  " }),
    ).toEqual({ notes: "Operator context" });
    expect(updateSupportAssignmentNotesDto.parse({ notes: null })).toEqual({
      notes: null,
    });
    expect(
      updateSupportAssignmentNotesDto.safeParse({
        notes: "Operator context",
        status: "ended",
      }).success,
    ).toBe(false);
  });

  it("exposes only command-specific lifecycle tools", () => {
    expect(
      getMcpTools(SupportAssignmentController).map((tool) => tool.methodKey),
    ).toEqual([
      "list",
      "listOwn",
      "listSponsorFamilyCatalog",
      "getSupportedFamilySummary",
      "getSupportedChildSummary",
      "getOwn",
      "selectFamilyForSponsor",
      "get",
      "create",
      "updateNotes",
      "end",
    ]);
    expect(
      getValidationConfig(SupportAssignmentController.prototype, "list")?.query,
    ).toBe(supportAssignmentListQuery);
    expect(
      getValidationConfig(SupportAssignmentController.prototype, "listOwn")
        ?.query,
    ).toBe(ownSupportAssignmentListQuery);
    expect(
      getValidationConfig(
        SupportAssignmentController.prototype,
        "listSponsorFamilyCatalog",
      )?.query,
    ).toBe(sponsorFamilyCatalogQuery);
    expect(
      getValidationConfig(SupportAssignmentController.prototype, "getOwn")
        ?.params,
    ).toBe(supportAssignmentIdParams);
    expect(
      getValidationConfig(SupportAssignmentController.prototype, "create")?.body,
    ).toBe(createSupportAssignmentDto);
    expect(
      getValidationConfig(
        SupportAssignmentController.prototype,
        "selectFamilyForSponsor",
      )?.body,
    ).toBe(selectSponsorFamilyDto);
    expect(
      getValidationConfig(
        SupportAssignmentController.prototype,
        "updateNotes",
      ),
    ).toMatchObject({
      body: updateSupportAssignmentNotesDto,
      params: supportAssignmentIdParams,
    });
    expect(
      getValidationConfig(SupportAssignmentController.prototype, "end"),
    ).toMatchObject({
      body: endSupportAssignmentDto,
      params: supportAssignmentIdParams,
    });
  });
});

describe("Phase 2 support assignment workflow", () => {
  it("creates an audited assignment from operator-controlled identity", async () => {
    const validatorCalls: string[] = [];
    const creates: Record<string, unknown>[] = [];
    const auditEvents: Record<string, unknown>[] = [];
    const service = new SupportAssignmentService(
      {
        create: async (input: Record<string, unknown>) => {
          creates.push(input);
          return assignmentRecord(input);
        },
      } as unknown as SupportAssignmentRepository,
      {
        record: async (input: Record<string, unknown>) => {
          auditEvents.push(input);
          return input;
        },
      } as unknown as AuditService,
      {
        ensureSponsorAssignable: async () => {
          validatorCalls.push("sponsor");
        },
        ensureFamilyExists: async () => {
          validatorCalls.push("household");
        },
        ensureNoActiveDuplicate: async () => {
          validatorCalls.push("duplicate");
        },
      } as unknown as SupportAssignmentValidator,
    );

    await service.create(
      {
        sponsorProfileId,
        familyProfileId: householdId,
        notes: "Only operators can read this",
      },
      "operator-user",
    );

    expect(validatorCalls).toEqual([
      "sponsor",
      "household",
      "duplicate",
    ]);
    expect(creates).toEqual([
      expect.objectContaining({
        sponsorProfileId,
        familyProfileId: householdId,
        childId: null,
        assignedByUserId: "operator-user",
      }),
    ]);
    expect(auditEvents).toEqual([
      expect.objectContaining({
        action: "supportAssignment.created",
        actorUserId: "operator-user",
        metadata: { hasChildTarget: false },
        resource: "supportAssignments",
        resourceId: assignmentId,
      }),
    ]);
  });

  it("updates only operator notes through an audited command", async () => {
    const updates: Array<{ id: string; notes: string | null }> = [];
    const auditEvents: Record<string, unknown>[] = [];
    const service = new SupportAssignmentService(
      {
        updateNotes: async (id: string, notes: string | null) => {
          updates.push({ id, notes });
          return assignmentRecord({ notes });
        },
      } as unknown as SupportAssignmentRepository,
      {
        record: async (input: Record<string, unknown>) => {
          auditEvents.push(input);
          return input;
        },
      } as unknown as AuditService,
      {
        ensureExists: async () => assignmentRecord(),
      } as unknown as SupportAssignmentValidator,
    );

    await service.updateNotes(
      assignmentId,
      { notes: "Updated operator context" },
      "operator-user",
    );

    expect(updates).toEqual([
      { id: assignmentId, notes: "Updated operator context" },
    ]);
    expect(auditEvents).toEqual([
      expect.objectContaining({
        action: "supportAssignment.notesUpdated",
        actorUserId: "operator-user",
        metadata: { hasNotes: true },
        resource: "supportAssignments",
        resourceId: assignmentId,
      }),
    ]);
  });

  it("scopes each sponsor to their own assignment list and hides guessed IDs", async () => {
    const listCalls: Array<[string, number, number, string | undefined]> = [];
    const service = new SupportAssignmentService(
      {
        listOwn: async (
          userId: string,
          limit: number,
          offset: number,
          status?: string,
        ) => {
          listCalls.push([userId, limit, offset, status]);
          return [];
        },
      } as unknown as SupportAssignmentRepository,
      {} as AuditService,
      {} as SupportAssignmentValidator,
    );
    const validator = new SupportAssignmentValidator(
      {
        findOwnById: async () => undefined,
      } as unknown as SupportAssignmentRepository,
      {} as never,
      {} as never,
    );

    await service.listOwn("sponsor-a", { status: "active" });
    await service.listOwn("sponsor-b", { status: "ended" });
    await expect(
      validator.ensureOwnedBy(assignmentId, "sponsor-b"),
    ).rejects.toMatchObject({ status: 404 });

    expect(listCalls).toEqual([
      ["sponsor-a", 50, 0, "active"],
      ["sponsor-b", 50, 0, "ended"],
    ]);
  });

  it("lets a sponsor select an active family once and reuses that selection", async () => {
    const creates: Record<string, unknown>[] = [];
    const auditEvents: Record<string, unknown>[] = [];
    const service = new SupportAssignmentService(
      {
        findSponsorByUserId: async () => ({ id: sponsorProfileId }),
        findActiveByTarget: async () => undefined,
        create: async (input: Record<string, unknown>) => {
          creates.push(input);
          return assignmentRecord(input);
        },
      } as unknown as SupportAssignmentRepository,
      {
        record: async (input: Record<string, unknown>) => {
          auditEvents.push(input);
          return input;
        },
      } as unknown as AuditService,
      {
        ensureSponsorAssignable: async () => undefined,
        ensureFamilyExists: async () => ({ status: "active" }),
      } as unknown as SupportAssignmentValidator,
    );

    await service.selectFamilyForSponsor({ familyProfileId: householdId }, "sponsor-user");

    expect(creates).toEqual([
      expect.objectContaining({
        sponsorProfileId,
        familyProfileId: householdId,
        childId: null,
        assignedByUserId: "sponsor-user",
      }),
    ]);
    expect(auditEvents).toEqual([
      expect.objectContaining({
        action: "supportAssignment.created",
        metadata: { hasChildTarget: false, selectedBySponsor: true },
      }),
    ]);
  });

  it("returns a directory without private family identity fields", async () => {
    const service = new SupportAssignmentService(
      {
        listSponsorFamilyCatalog: async () => [
          {
            id: householdId,
            image: "/images/family.webp",
            fundingStatus: "pending_funding" as const,
            fundingTargetMinor: 750_000,
            fundingActivatedAt: null,
            activeChildCount: 2,
          },
        ],
      } as unknown as SupportAssignmentRepository,
      {} as AuditService,
      {} as SupportAssignmentValidator,
      {
        getProgressForFamilies: async () => new Map([
          [householdId, {
            status: "pending_funding" as const,
            targetMinor: 750_000,
            fundedMinor: 200_000,
            remainingMinor: 550_000,
            activatedAt: null,
          }],
        ]),
      } as never,
    );

    const catalog = await service.listSponsorFamilyCatalog({});

    expect(catalog).toEqual([
      expect.objectContaining({
        id: householdId,
        reference: "Family 00000000",
        activeChildCount: 2,
      }),
    ]);
    expect(JSON.stringify(catalog)).not.toContain("exactAddress");
    expect(JSON.stringify(catalog)).not.toContain("guardianCin");
    expect(JSON.stringify(catalog)).not.toContain("guardianDateOfBirth");
  });

  it("returns a sponsor-safe family projection only", async () => {
    const service = new SupportAssignmentService(
      {
        findFamilySummaryByAssignmentId: async () => ({
          familyProfileId: "12345678-0000-4000-8000-000000000000",
          childCount: 2,
        }),
      } as unknown as SupportAssignmentRepository,
      {} as AuditService,
      {
        ensureOwnedBy: async () => assignmentRecord(),
        ensureActive: () => {},
      } as unknown as SupportAssignmentValidator,
    );

    const summary = await service.getSupportedFamilySummary(
      assignmentId,
      "sponsor-user",
    );

    expect(summary).toEqual({
      assignment: {
        id: assignmentId,
        startedAt: expect.any(Date),
      },
      family: {
        reference: "Family 12345678",
        activeChildCount: 2,
      },
    });
    expect(JSON.stringify(summary)).not.toContain("exactAddress");
    expect(JSON.stringify(summary)).not.toContain("guardianDateOfBirth");
    expect(JSON.stringify(summary)).not.toContain("notes");
  });

  it("does not allow an ended relationship to retain sponsor summary access", () => {
    const validator = new SupportAssignmentValidator(
      {} as SupportAssignmentRepository,
      {} as never,
      {} as never,
    );

    expect(() => validator.ensureActive("ended")).toThrow(
      "Support assignment is already ended",
    );
  });
});

function assignmentRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: assignmentId,
    sponsorProfileId,
    familyProfileId: householdId,
    childId: null,
    status: "active" as const,
    startedAt: new Date("2026-07-16T00:00:00.000Z"),
    endedAt: null,
    assignedByUserId: "operator-user",
    endedByUserId: null,
    notes: "Operator only",
    createdAt: new Date("2026-07-16T00:00:00.000Z"),
    updatedAt: new Date("2026-07-16T00:00:00.000Z"),
    ...overrides,
  };
}
