import { describe, expect, it } from "bun:test";
import type { AuthService, UserRepository, UserService } from "najm-auth";
import { db } from "../src/config/databaseConfig";
import { server } from "../src/server";
import { getMcpTools } from "najm-mcp";
import { getValidationConfig } from "najm-validation";

import { AuditRepository, AuditService } from "../src/modules/audit";
import { AccessRepository } from "../src/modules/access";
import { BudgetService } from "../src/modules/budgets";
import {
  childIdParams,
  ChildController,
  ChildRepository,
  ChildService,
  ChildValidator,
  createChildDto,
  updateChildDto,
} from "../src/modules/children";
import {
  createFamilyDto,
  FamilyController,
  FamilyRepository,
  FamilyService,
  FamilyValidator,
  updateFamilyDto,
} from "../src/modules/families";
import { FundingService, SettingRepository } from "../src/modules/settings";

const familyId = "00000000-0000-4000-8000-000000000030";
const childId = "00000000-0000-4000-8000-000000000032";

describe("Phase 1 DTO and controller boundaries", () => {
  it("makes family provisioning operator-owned and requires family identity", () => {
    const parsed = createFamilyDto.parse({
      name: "Amina El Amrani",
      email: "family@example.test",
      image: "https://images.example.test/families/family.jpg",
      password: "CallerChosen1",
      role: "operator",
      roleId: "operator-role",
      status: "active",
      guardianCin: "ab123456",
      guardianDateOfBirth: "1987-03-12",
      exactAddress: "Private address in Rabat",
      phone: "+212600000001",
      initialChildren: [
        {
          legalName: "Child Name",
          dateOfBirth: "2018-06-01",
          gender: "F",
        },
      ],
    });

    expect(parsed).toMatchObject({
      email: "family@example.test",
      image: "https://images.example.test/families/family.jpg",
    });
    expect(parsed.guardianCin).toBe("AB123456");
    expect(parsed).not.toHaveProperty("password");
    expect(parsed).not.toHaveProperty("role");
    expect(parsed).not.toHaveProperty("roleId");
    expect(parsed).not.toHaveProperty("status");
    expect(
      createFamilyDto.safeParse({ email: "family@example.test" }).success,
    ).toBe(false);
    expect(
      createFamilyDto.safeParse({
        name: "Amina El Amrani",
        email: "family@example.test",
        guardianCin: "AB123456",
        guardianDateOfBirth: "1987-03-12",
        exactAddress: "Private address in Rabat",
        phone: "+212600000001",
      }).success,
    ).toBe(true);
    expect(
      createFamilyDto.safeParse({
        email: "family@example.test",
        image: "not-a-url",
        guardianCin: "AB123456",
        exactAddress: "Private address in Rabat",
      }).success,
    ).toBe(false);

    expect(
      createFamilyDto.safeParse({
        name: "Stored Family",
        email: "stored-image@example.test",
        image: "/api/family-images/files/serve/family.webp",
        guardianCin: "ST123456",
        guardianDateOfBirth: "1987-03-12",
        exactAddress: "10 Storage Street",
        phone: "+212600000002",
      }).success,
    ).toBe(true);
  });

  it("accepts the full editable family profile without caller-owned lifecycle fields", () => {
    const parsed = updateFamilyDto.parse({
      name: "Updated Guardian",
      email: "updated@example.test",
      image: "/api/family-images/files/serve/00000000-0000-4000-8000-000000000031.webp",
      guardianCin: "cd987654",
      guardianDateOfBirth: "1982-09-21",
      exactAddress: "Updated address in Rabat",
      phone: "+212600000009",
      relationshipToChildren: "Guardian",
      notes: "Updated intake notes",
      fundingTargetMinor: 640000,
      initialChildren: [
        {
          legalName: "Ignored Child",
          dateOfBirth: "2017-06-01",
          gender: "F",
        },
      ],
      roleId: "sponsor-role",
      status: "inactive",
      password: "CallerChosen1",
    });

    expect(parsed).toMatchObject({
      name: "Updated Guardian",
      email: "updated@example.test",
      image: "/api/family-images/files/serve/00000000-0000-4000-8000-000000000031.webp",
      guardianCin: "CD987654",
    });
    expect(parsed).not.toHaveProperty("roleId");
    expect(parsed).not.toHaveProperty("status");
    expect(parsed).not.toHaveProperty("password");
    expect(parsed).not.toHaveProperty("initialChildren");
  });

  it("exposes family and child commands as validated MCP tools", () => {
    expect(getMcpTools(FamilyController).map((tool) => tool.methodKey)).toEqual(
      [
        "list",
        "getOwn",
        "get",
        "create",
        "update",
        "delete",
        "deactivate",
        "reactivate",
      ],
    );
    expect(getMcpTools(ChildController).map((tool) => tool.methodKey)).toEqual(
      [
        "list",
        "listOwn",
        "getOwn",
        "get",
        "create",
        "update",
        "delete",
        "deactivate",
        "reactivate",
      ],
    );
    expect(getValidationConfig(FamilyController.prototype, "create")?.body).toBe(
      createFamilyDto,
    );
    expect(getValidationConfig(ChildController.prototype, "get")?.params).toBe(
      childIdParams,
    );
    expect(getValidationConfig(ChildController.prototype, "create")?.body).toBe(
      createChildDto,
    );
  });

});

describe("Phase 1 family workflow", () => {
  it("provisions a phone-first family profile, children, and audit event", async () => {
    const accountCreates: Record<string, unknown>[] = [];
    const familyCreates: Record<string, unknown>[] = [];
    const childCreates: Record<string, unknown>[] = [];
    const auditEvents: Record<string, unknown>[] = [];
    const passwordRequirements: string[] = [];
    const service = new FamilyService(
      {
        provisionUser: async (input: Record<string, unknown>) => {
          accountCreates.push(input);
          return { id: "family-user" };
        },
      } as unknown as AuthService,
      {} as UserService,
      {
        create: async (input: Record<string, unknown>) => {
          familyCreates.push(input);
          return familyProfile(input);
        },
      } as unknown as FamilyRepository,
      {
        create: async (input: Record<string, unknown>) => {
          childCreates.push(input);
          return { id: childId, ...input };
        },
      } as unknown as ChildRepository,
      {
        ensureForFamily: async () => {},
      } as unknown as BudgetService,
      {
        record: async (input: Record<string, unknown>) => {
          auditEvents.push(input);
          return input;
        },
      } as unknown as AuditService,
      {
        ensureEmailUnique: async () => {},
        ensureGuardianCinUnique: async () => {},
        ensurePhoneUnique: async () => {},
        ensureIdUnique: async () => {},
        ensureUserIdUnique: async () => {},
      } as unknown as FamilyValidator,
      {} as FundingService,
      {} as SettingRepository,
      { update: async () => ({}) } as unknown as UserRepository,
      {
        requireFamilyPasswordChange: async (userId: string) => {
          passwordRequirements.push(userId);
          return { userId, required: true };
        },
      } as unknown as AccessRepository,
    );

    await service.create(
      {
        id: familyId,
        name: "Amina El Amrani",
        email: "family@example.test",
        image: "https://images.example.test/families/family.jpg",
        fundingTargetMinor: 720000,
        guardianCin: "ab123456",
        guardianDateOfBirth: "1987-03-12",
        exactAddress: "Private address in Rabat",
        phone: "+212600000001",
        initialChildren: [
          {
            legalName: "Child Name",
            dateOfBirth: "2018-06-01",
            gender: "F",
          },
        ],
      },
      "operator-user",
    );

    expect(accountCreates).toEqual([
      expect.objectContaining({
        email: "family@example.test",
        image: "https://images.example.test/families/family.jpg",
        role: "family",
        password: "Amrani1987",
      }),
    ]);
    expect(familyCreates).toEqual([
      expect.objectContaining({
        createdByUserId: "operator-user",
        guardianLegalName: "Amina El Amrani",
        guardianCin: "AB123456",
        guardianDateOfBirth: "1987-03-12",
        phone: "+212600000001",
      }),
    ]);
    expect(childCreates).toEqual([
      expect.objectContaining({
        familyProfileId: familyId,
        status: "active",
      }),
    ]);
    expect(auditEvents).toEqual([
      expect.objectContaining({
        action: "family.created",
        actorUserId: "operator-user",
        metadata: { childCount: 1, fundingTargetMinor: 720000 },
        resource: "families",
        resourceId: familyId,
      }),
    ]);
    expect(passwordRequirements).toEqual(["family-user"]);
  });

  it("includes each family's funding progress in the operator list", async () => {
    const family = familyProfile();
    const progress = {
      status: "pending_funding" as const,
      targetMinor: 720000,
      fundedMinor: 540000,
      remainingMinor: 180000,
      activatedAt: null,
    };
    const service = new FamilyService(
      {} as AuthService,
      {} as UserService,
      {
        list: async () => [family],
        listActiveSponsorsForFamilies: async (familyIds: string[]) => {
          expect(familyIds).toEqual([familyId]);
          return [
            {
              familyProfileId: familyId,
              sponsorProfileId: "sponsor-profile-1",
              sponsorName: "Sponsor One",
            },
            {
              familyProfileId: familyId,
              sponsorProfileId: "sponsor-profile-1",
              sponsorName: "Sponsor One",
            },
            {
              familyProfileId: familyId,
              sponsorProfileId: "sponsor-profile-2",
              sponsorName: "Sponsor Two",
            },
          ];
        },
      } as unknown as FamilyRepository,
      {} as ChildRepository,
      {} as BudgetService,
      {} as AuditService,
      {} as FamilyValidator,
      {
        getProgressForFamilies: async (
          families: Parameters<FundingService["getProgressForFamilies"]>[0],
        ) => {
          expect(families).toEqual([family]);
          return new Map([[familyId, progress]]);
        },
      } as unknown as FundingService,
      {} as SettingRepository,
    );

    await expect(service.list({ limit: 25, offset: 0 })).resolves.toEqual([
      {
        ...family,
        funding: progress,
        activeSponsorNames: ["Sponsor One", "Sponsor Two"],
      },
    ]);
  });

  it("returns a family-owned projection without operator notes", async () => {
    const service = new FamilyService(
      {} as AuthService,
      {} as UserService,
      {
        findByUserId: async () => familyProfile({ notes: "Operator only" }),
      } as unknown as FamilyRepository,
      {} as ChildRepository,
      {} as BudgetService,
      {} as AuditService,
      {} as FamilyValidator,
      {} as FundingService,
      {} as SettingRepository,
    );

    const own = await service.getOwn("family-user");

    expect(own).toMatchObject({
      guardianLegalName: "Family Guardian",
      exactAddress: "Private address in Rabat",
      phone: "+212600000001",
    });
    expect(own).not.toHaveProperty("notes");
    expect(own).not.toHaveProperty("guardianCin");
  });

  it("updates and rechecks only the changed family's activation target", async () => {
    const updates: Record<string, unknown>[] = [];
    const auditEvents: Record<string, unknown>[] = [];
    const activationChecks: Record<string, string>[] = [];
    const service = new FamilyService(
      {} as AuthService,
      {} as UserService,
      {
        update: async (id: string, input: Record<string, unknown>) => {
          updates.push({ id, input });
          return familyProfile(input);
        },
      } as unknown as FamilyRepository,
      {} as ChildRepository,
      {} as BudgetService,
      {
        record: async (input: Record<string, unknown>) => {
          auditEvents.push(input);
          return input;
        },
      } as unknown as AuditService,
      {
        ensureExists: async () => familyProfile(),
        ensureEmailUnique: async () => {},
        ensureGuardianCinUnique: async () => {},
        ensurePhoneUnique: async () => {},
      } as unknown as FamilyValidator,
      {
        activateIfEligible: async (
          familyProfileId: string,
          actorUserId: string,
        ) => {
          activationChecks.push({ familyProfileId, actorUserId });
          return null;
        },
      } as unknown as FundingService,
      {} as SettingRepository,
    );

    await expect(
      service.update(
        familyId,
        { fundingTargetMinor: 540_000 },
        "operator-user",
      ),
    ).resolves.toMatchObject({ fundingTargetMinor: 540_000 });

    expect(updates).toEqual([
      { id: familyId, input: { fundingTargetMinor: 540_000 } },
    ]);
    expect(auditEvents).toEqual([
      expect.objectContaining({
        action: "family.fundingTargetUpdated",
        actorUserId: "operator-user",
        metadata: {
          previousTargetMinor: 720_000,
          targetMinor: 540_000,
        },
      }),
    ]);
    expect(activationChecks).toEqual([
      { familyProfileId: familyId, actorUserId: "operator-user" },
    ]);
  });

  it("updates the complete family profile without accepting child edits", async () => {
    const accountUpdates: Record<string, unknown>[] = [];
    const profileUpdates: Record<string, unknown>[] = [];
    const service = new FamilyService(
      {} as AuthService,
      {
        update: async (_id: string, input: Record<string, unknown>) => {
          accountUpdates.push(input);
          return { id: "family-user" };
        },
      } as unknown as UserService,
      {
        update: async (_id: string, input: Record<string, unknown>) => {
          profileUpdates.push(input);
          return familyProfile(input);
        },
      } as unknown as FamilyRepository,
      {} as ChildRepository,
      {} as BudgetService,
      {} as AuditService,
      {
        ensureExists: async () => familyProfile(),
        ensureEmailUnique: async () => {},
        ensureGuardianCinUnique: async () => {},
        ensurePhoneUnique: async () => {},
      } as unknown as FamilyValidator,
      {} as FundingService,
      {} as SettingRepository,
    );

    await service.update(
      familyId,
      {
        name: "Updated Guardian",
        email: "updated@example.test",
        image: "/api/family-images/files/serve/00000000-0000-4000-8000-000000000031.webp",
        guardianCin: "cd987654",
        guardianDateOfBirth: "1982-09-21",
        exactAddress: "Updated address in Rabat",
        phone: "+212600000009",
        relationshipToChildren: "Guardian",
        notes: "Updated intake notes",
      },
      "operator-user",
    );

    expect(accountUpdates).toEqual([
      {
        name: "Updated Guardian",
        email: "updated@example.test",
        image: "/api/family-images/files/serve/00000000-0000-4000-8000-000000000031.webp",
      },
    ]);
    expect(profileUpdates).toEqual([
      expect.objectContaining({
        guardianLegalName: "Updated Guardian",
        guardianCin: "CD987654",
        exactAddress: "Updated address in Rabat",
        phone: "+212600000009",
        relationshipToChildren: "Guardian",
        notes: "Updated intake notes",
      }),
    ]);
  });

  it("rolls back family provisioning when a later child write fails", async () => {
    await server.init();
    const wiredService = server.container.get(FamilyService) as unknown as Record<
      string,
      unknown
    >;
    const originalDependencies = {
      auth: wiredService.auth,
      users: wiredService.users,
      families: wiredService.families,
      children: wiredService.children,
      budgets: wiredService.budgets,
      audits: wiredService.audits,
      validator: wiredService.validator,
      settings: wiredService.settings,
      userRecords: wiredService.userRecords,
      access: wiredService.access,
    };
    const transactionalDb = db as unknown as {
      transaction: (callback: (transaction: unknown) => Promise<unknown>) => Promise<unknown>;
    };
    const originalTransaction = transactionalDb.transaction;
    const transactionEvents: string[] = [];
    const auditEvents: Record<string, unknown>[] = [];

    transactionalDb.transaction = async (callback) => {
      transactionEvents.push("begin");
      try {
        const result = await callback({});
        transactionEvents.push("commit");
        return result;
      } catch (error) {
        transactionEvents.push("rollback");
        throw error;
      }
    };
    Object.assign(wiredService, {
      auth: {
        provisionUser: async () => ({ id: "family-user" }),
      } as unknown as AuthService,
      users: {} as UserService,
      userRecords: { update: async () => ({}) },
      access: {
        requireFamilyPasswordChange: async () => ({ required: true }),
      },
      families: {
        create: async () => familyProfile(),
      } as unknown as FamilyRepository,
      children: {
        create: async () => {
          throw new Error("child write failed");
        },
      } as unknown as ChildRepository,
      budgets: {
        ensureForFamily: async () => {},
      } as unknown as BudgetService,
      audits: {
        record: async (input: Record<string, unknown>) => {
          auditEvents.push(input);
          return input;
        },
      } as unknown as AuditService,
      validator: {
        ensureEmailUnique: async () => {},
        ensureGuardianCinUnique: async () => {},
        ensurePhoneUnique: async () => {},
        ensureIdUnique: async () => {},
        ensureUserIdUnique: async () => {},
      } as FamilyValidator,
    });

    try {
      await expect(
        (wiredService.create as FamilyService["create"]) (
          {
            name: "Amina El Amrani",
            email: "family@example.test",
            fundingTargetMinor: 720000,
            guardianCin: "AB123456",
            guardianDateOfBirth: "1987-03-12",
            exactAddress: "Private address in Rabat",
            phone: "+212600000001",
            initialChildren: [
              {
                legalName: "Child Name",
                dateOfBirth: "2018-06-01",
                gender: "F",
              },
            ],
          },
          "operator-user",
        ),
      ).rejects.toThrow("child write failed");
      expect(transactionEvents).toEqual(["begin", "rollback"]);
      expect(auditEvents).toEqual([]);
    } finally {
      transactionalDb.transaction = originalTransaction;
      Object.assign(wiredService, originalDependencies);
    }
  });

  it("permanently removes the complete family graph and login, then audits the admin action", async () => {
    const deletedProfileIds: string[] = [];
    const deletedUserIds: string[] = [];
    const auditEvents: Record<string, unknown>[] = [];
    const service = new FamilyService(
      {} as AuthService,
      {
        delete: async (userId: string) => {
          deletedUserIds.push(userId);
          return { id: userId };
        },
      } as unknown as UserService,
      {
        deleteWithLinkedRecords: async (id: string) => {
          deletedProfileIds.push(id);
          return familyProfile();
        },
      } as unknown as FamilyRepository,
      {} as ChildRepository,
      {} as BudgetService,
      {
        record: async (input: Record<string, unknown>) => {
          auditEvents.push(input);
          return input;
        },
      } as unknown as AuditService,
      {
        ensureExists: async () => familyProfile(),
      } as unknown as FamilyValidator,
      {} as FundingService,
      {} as SettingRepository,
    );

    await expect(service.delete(familyId, "admin-user")).resolves.toMatchObject({
      id: familyId,
    });
    expect(deletedProfileIds).toEqual([familyId]);
    expect(deletedUserIds).toEqual(["family-user"]);
    expect(auditEvents).toEqual([
      expect.objectContaining({
        action: "family.deleted",
        actorUserId: "admin-user",
        resourceId: familyId,
        metadata: { permanent: true },
      }),
    ]);
  });

  it("allows admin deletion when a family has linked records", async () => {
    const deletedUserIds: string[] = [];
    const deletedFamilyIds: string[] = [];
    const service = new FamilyService(
      {} as AuthService,
      {
        delete: async (id: string) => {
          deletedUserIds.push(id);
          return { id };
        },
      } as unknown as UserService,
      {
        deleteWithLinkedRecords: async (id: string) => {
          deletedFamilyIds.push(id);
          return familyProfile();
        },
      } as unknown as FamilyRepository,
      {} as ChildRepository,
      {} as BudgetService,
      { record: async () => ({}) } as unknown as AuditService,
      { ensureExists: async () => familyProfile() } as unknown as FamilyValidator,
      {} as FundingService,
      {} as SettingRepository,
    );

    await expect(service.delete(familyId, "admin-user")).resolves.toMatchObject({
      id: familyId,
    });
    expect(deletedFamilyIds).toEqual([familyId]);
    expect(deletedUserIds).toEqual(["family-user"]);
  });
});

describe("Phase 1 child and audit safety", () => {
  it("does not clear omitted optional child fields during an update", async () => {
    const updates: Record<string, unknown>[] = [];
    const service = new ChildService(
      {
        update: async (_id: string, input: Record<string, unknown>) => {
          updates.push(input);
          return { id: childId, ...input };
        },
      } as unknown as ChildRepository,
      {} as FamilyRepository,
      {} as AuditService,
      {
        ensureExists: async () => childRecord(),
      } as unknown as ChildValidator,
    );

    await service.update(childId, { legalName: "Updated Child" });

    expect(updates).toEqual([{ legalName: "Updated Child" }]);
    expect(updateChildDto.parse({ legalName: "Updated Child" })).toEqual({
      legalName: "Updated Child",
    });
  });

  it("permanently removes a child record and audits the admin action", async () => {
    const deletedIds: string[] = [];
    const auditEvents: Record<string, unknown>[] = [];
    const service = new ChildService(
      {
        delete: async (id: string) => {
          deletedIds.push(id);
          return childRecord();
        },
      } as unknown as ChildRepository,
      {} as FamilyRepository,
      {
        record: async (input: Record<string, unknown>) => {
          auditEvents.push(input);
          return input;
        },
      } as unknown as AuditService,
      {
        ensureExists: async () => childRecord(),
      } as unknown as ChildValidator,
    );

    await expect(service.delete(childId, "admin-user")).resolves.toMatchObject({
      id: childId,
    });
    expect(deletedIds).toEqual([childId]);
    expect(auditEvents).toEqual([
      expect.objectContaining({
        action: "child.deleted",
        actorUserId: "admin-user",
        resourceId: childId,
      }),
    ]);
  });

  it("allows the linked family but not a second family to read a child", async () => {
    const service = new ChildService(
      {
        findById: async () => childRecord({ familyProfileId: familyId }),
      } as unknown as ChildRepository,
      {
        findByUserId: async (userId: string) =>
          familyProfile({
            id:
              userId === "linked-family-user"
                ? familyId
                : "00000000-0000-4000-8000-000000000099",
          }),
      } as unknown as FamilyRepository,
      {} as AuditService,
      {
        ensureExists: async () => childRecord({ familyProfileId: familyId }),
      } as unknown as ChildValidator,
    );

    await expect(service.getOwn(childId, "linked-family-user")).resolves.toMatchObject({
      id: childId,
    });
    await expect(service.getOwn(childId, "other-family-user")).rejects.toMatchObject({
      status: 404,
    });
  });

  it("omits operator notes from family-owned child responses", async () => {
    const service = new ChildService(
      {
        listByFamilyId: async () => [
          childRecord({ notes: "Operator-only safeguarding note" }),
        ],
      } as unknown as ChildRepository,
      {
        findByUserId: async () => familyProfile(),
      } as unknown as FamilyRepository,
      {} as AuditService,
      {} as ChildValidator,
    );

    const [child] = await service.listOwn("family-user");

    expect(child).not.toHaveProperty("notes");
    expect(child).toMatchObject({ id: childId, legalName: "Child Name" });
  });

  it("filters secret-like metadata before an audit event is persisted", async () => {
    const creates: Record<string, unknown>[] = [];
    const service = new AuditService(
      {
        create: async (input: Record<string, unknown>) => {
          creates.push(input);
          return input;
        },
      } as unknown as AuditRepository,
    );

    await service.record({
      action: "family.deactivated",
      actorUserId: "operator-user",
      metadata: {
        reason: "Duplicate intake",
        cin: "CD987654",
        guardianCin: "AB123456",
        password: "never-store-this",
        nested: { unsafe: true },
      },
      resource: "families",
      resourceId: familyId,
    });

    expect(creates).toEqual([
      expect.objectContaining({ metadata: { reason: "Duplicate intake" } }),
    ]);
  });
});

function familyProfile(overrides: Record<string, unknown> = {}) {
  return {
    id: familyId,
    userId: "family-user",
    relationshipToChildren: null,
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    name: "Family Guardian",
    email: "family@example.test",
    image: null,
    emailVerified: true,
    status: "active" as const,
    role: "family",
    fundingStatus: "pending_funding" as const,
    fundingTargetMinor: 720_000,
    fundingActivatedAt: null,
    activeChildCount: 0,
    activeSponsorCount: 0,
    guardianLegalName: "Family Guardian",
    guardianCin: "AB123456",
    guardianDateOfBirth: "1987-03-12",
    exactAddress: "Private address in Rabat",
    phone: "+212600000001",
    ...overrides,
  };
}

function childRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: childId,
    familyProfileId: familyId,
    legalName: "Child Name",
    dateOfBirth: "2018-06-01",
    gender: "F",
    schoolLevel: "Primary",
    clothingSize: null,
    shoeSize: null,
    notes: null,
    status: "active",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}
