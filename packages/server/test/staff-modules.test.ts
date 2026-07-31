import { describe, expect, it } from "bun:test";
import type {
  AuthService,
  SanitizedUser,
  TokenService,
  UserRepository,
  UserService,
} from "najm-auth";
import {
  getMcpAnnotations,
  getMcpConfirmation,
  getMcpToolGroup,
  getMcpTools,
} from "najm-mcp";
import { getValidationConfig } from "najm-validation";

import { AuditService } from "../src/modules/audit";
import type { CreateStaffDto } from "../src/modules/staff/staffDto";
import {
  bulkDeleteStaffDto,
  createStaffDto,
  provisionOperatorAccessDto,
  staffIdParams,
  staffListQuery,
  type StaffRecord,
  staffStatusDto,
  type StaffStatusDto,
  updateStaffDto,
} from "../src/modules/staff";
import type { NewStaffProfile } from "../src/modules/staff/staffSchema";
import { StaffController } from "../src/modules/staff/staffController";
import {
  type DeliveryStaffOption,
  StaffRepository,
} from "../src/modules/staff/staffRepository";
import { StaffService } from "../src/modules/staff/staffService";
import { StaffValidator } from "../src/modules/staff/staffValidator";

const staffId = "00000000-0000-4000-8000-000000000001";

function makeStaffRecord(overrides: Partial<StaffRecord> = {}): StaffRecord {
  return {
    id: staffId,
    userId: "operator-user",
    name: "Safe Operator",
    contactEmail: "operator@example.test",
    email: "operator@example.test",
    emailVerified: true,
    phone: "+212600000000",
    image: null,
    affiliation: "internal",
    companyName: null,
    cin: "AB123456",
    gender: "F",
    address: "Rabat",
    dateOfBirth: "1990-05-20",
    jobTitle: "Case reviewer",
    status: "active",
    notes: null,
    functions: ["operator"],
    hasOperatorAccess: true,
    role: "operator",
    userStatus: "active",
    createdAt: new Date("2026-07-30T00:00:00.000Z"),
    updatedAt: new Date("2026-07-30T00:00:00.000Z"),
    ...overrides,
  };
}

describe("staff module DTOs", () => {
  it("rejects an operator function without contactEmail", () => {
    expect(
      createStaffDto.safeParse({
        affiliation: "internal",
        cin: "AB123456",
        contactEmail: undefined,
        dateOfBirth: "1990-05-20",
        functions: ["operator"],
        gender: "F",
        address: "Rabat",
        name: "Safe Operator",
        phone: "+212600000000",
      }).success,
    ).toBe(false);
  });

  it("requires company name for external staff records", () => {
    expect(
      createStaffDto.safeParse({
        affiliation: "external",
        companyName: "",
        functions: ["delivery"],
        name: "External Courier",
        phone: "+212600000000",
      }).success,
    ).toBe(false);
    expect(
      createStaffDto.safeParse({
        affiliation: "external",
        companyName: "DHL",
        functions: ["delivery"],
        name: "External Courier",
        phone: "+212600000000",
      }).success,
    ).toBe(true);
  });

  it("rejects unknown function keys and duplicates", () => {
    expect(
      createStaffDto.safeParse({
        affiliation: "internal",
        functions: ["operator", "operator"],
        name: "Duplicate Function",
        phone: "+212600000000",
      }).success,
    ).toBe(false);
    expect(
      createStaffDto.safeParse({
        affiliation: "internal",
        functions: ["driver"],
        name: "Unknown Function",
        phone: "+212600000000",
      }).success,
    ).toBe(false);
  });

  it("rejects operator access creation on external affiliation", () => {
    expect(
      createStaffDto.safeParse({
        affiliation: "external",
        companyName: "DHL",
        contactEmail: "ops@dhl.test",
        createOperatorAccess: true,
        functions: ["operator"],
        name: "External Operator",
        phone: "+212600000000",
      }).success,
    ).toBe(false);
  });

  it("uses staff UUID params and coerces pagination", () => {
    expect(staffIdParams.parse({ id: staffId })).toEqual({ id: staffId });
    expect(
      staffListQuery.parse({
        hasAccess: "true",
        limit: "25",
        offset: "5",
        status: "active",
      }),
    ).toMatchObject({
      hasAccess: true,
      limit: 25,
      offset: 5,
      sortBy: "name",
      sortDirection: "asc",
      status: "active",
    });
    expect(staffListQuery.safeParse({ limit: "101" }).success).toBe(false);
    expect(
      staffListQuery.safeParse({ functionKey: "driver" }).success,
    ).toBe(false);
    expect(
      staffListQuery.parse({ sortBy: "createdAt", sortDirection: "desc" }),
    ).toMatchObject({ sortBy: "createdAt", sortDirection: "desc" });
    expect(staffListQuery.safeParse({ sortBy: "notes" }).success).toBe(false);
  });

  it("requires reasons for deactivate/reactivate and DELETE for permanent delete", () => {
    expect(staffStatusDto.safeParse({ reason: "x" }).success).toBe(false);
    expect(
      staffStatusDto.safeParse({ reason: "long enough reason" }).success,
    ).toBe(true);
    expect(bulkDeleteStaffDto.safeParse({ ids: [] }).success).toBe(false);
  });
});

describe("staff module controller validation", () => {
  it("exposes staff operations as guarded MCP tools", () => {
    expect(getMcpToolGroup(StaffController)).toBe("staff");
    expect(getMcpTools(StaffController).map((tool) => tool.methodKey)).toEqual([
      "listDeliveryOptions",
      "list",
      "get",
      "create",
      "update",
      "deactivate",
      "reactivate",
      "provisionOperatorAccess",
      "delete",
      "bulkDelete",
    ]);
    expect(
      getMcpAnnotations(StaffController.prototype.list)?.readOnlyHint,
    ).toBe(true);
    expect(
      getMcpConfirmation(StaffController.prototype.delete),
    ).toMatchObject({ level: "danger" });
  });

  it("binds validation to every staff route", () => {
    expect(getValidationConfig(StaffController.prototype, "list")?.query).toBe(
      staffListQuery,
    );
    expect(
      getValidationConfig(StaffController.prototype, "get")?.params,
    ).toBe(staffIdParams);
    expect(
      getValidationConfig(StaffController.prototype, "create")?.body,
    ).toBe(createStaffDto);
    expect(getValidationConfig(StaffController.prototype, "update")).toMatchObject({
      body: updateStaffDto,
      params: staffIdParams,
    });
    expect(
      getValidationConfig(StaffController.prototype, "deactivate"),
    ).toMatchObject({ body: staffStatusDto, params: staffIdParams });
    expect(
      getValidationConfig(StaffController.prototype, "provisionOperatorAccess"),
    ).toMatchObject({
      body: provisionOperatorAccessDto,
      params: staffIdParams,
    });
  });
});

describe("staff module services", () => {
  it("creates a delivery-only staff record without provisioning a Najm user", async () => {
    const profileCreates: NewStaffProfile[] = [];
    const auditEvents: Record<string, unknown>[] = [];
    const usersUpdates: Array<{ id: string; data: Record<string, unknown> }> = [];

    const service = new StaffService(
      {
        createProfile: async (input: NewStaffProfile) => {
          profileCreates.push(input);
          return makeStaffRecord({
            affiliation: "internal",
            companyName: null,
            contactEmail: null,
            email: null,
            functions: ["delivery"],
            hasOperatorAccess: false,
            userId: null,
          });
        },
        setFunctions: async () => undefined,
        findById: async () =>
          makeStaffRecord({
            functions: ["delivery"],
            hasOperatorAccess: false,
            userId: null,
          }),
        deleteProfile: async () => undefined,
      } as unknown as StaffRepository,
      {
        provisionUser: async () => {
          throw new Error("should not provision delivery-only staff");
        },
      } as unknown as AuthService,
      {
        update: async (id: string, data: Record<string, unknown>) => {
          usersUpdates.push({ id, data });
          return { id, role: "operator" } as SanitizedUser;
        },
      } as unknown as UserService,
      {
        ensureCinUnique: async () => undefined,
        ensureEmailUnique: async () => undefined,
        ensureExists: async () =>
          makeStaffRecord({
            functions: ["delivery"],
            hasOperatorAccess: false,
            userId: null,
          }),
        ensureIdUnique: async () => undefined,
        ensurePhoneUnique: async () => undefined,
      } as unknown as StaffValidator,
      {
        record: async (event: Record<string, unknown>) => {
          auditEvents.push(event);
        },
      } as unknown as AuditService,
    );

    const created = await service.create(
      {
        affiliation: "internal",
        functions: ["delivery"],
        name: "Delivery Driver",
        phone: "+212600000000",
      } as CreateStaffDto,
      "admin-user",
    );

    expect(created).toMatchObject({
      functions: ["delivery"],
      hasOperatorAccess: false,
      userId: null,
    });
    expect(profileCreates).toHaveLength(1);
    expect(usersUpdates).toHaveLength(0);
    expect(auditEvents).toContainEqual(
      expect.objectContaining({
        action: "staff.created",
        actorUserId: "admin-user",
        metadata: {
          functions: ["delivery"],
          affiliation: "internal",
          hasAccount: false,
        },
      }),
    );
  });

  it("provisions an operator account with a one-time credential when requested", async () => {
    const functionSets: string[][] = [];
    const provisionCalls: Array<Record<string, unknown>> = [];
    const auditEvents: Record<string, unknown>[] = [];

    const service = new StaffService(
      {
        createProfile: async () => makeStaffRecord({ contactEmail: null, userId: null }),
        setFunctions: async (_id: string, functions: string[]) => {
          functionSets.push(functions);
          return undefined;
        },
        findById: async () => makeStaffRecord({ userId: "operator-user" }),
        updateProfile: async () => makeStaffRecord({ userId: "operator-user" }),
        deleteProfile: async () => undefined,
      } as unknown as StaffRepository,
      {
        provisionUser: async (input: Record<string, unknown>) => {
          provisionCalls.push(input);
          return { id: "operator-user", role: "operator" } as SanitizedUser;
        },
      } as unknown as AuthService,
      {
        update: async () => ({ id: "operator-user", role: "operator" } as SanitizedUser),
      } as unknown as UserService,
      {
        ensureCinUnique: async () => undefined,
        ensureEmailUnique: async () => undefined,
        ensureExists: async () => makeStaffRecord(),
        ensureIdUnique: async () => undefined,
        ensurePhoneUnique: async () => undefined,
      } as unknown as StaffValidator,
      {
        record: async (event: Record<string, unknown>) => {
          auditEvents.push(event);
        },
      } as unknown as AuditService,
      undefined,
      {
        update: async () => ({ id: "operator-user", role: "operator" } as SanitizedUser),
      } as unknown as UserRepository,
    );

    const result = await service.create(
      {
        affiliation: "internal",
        cin: "AB123456",
        contactEmail: "operator@example.test",
        createOperatorAccess: true,
        createOperatorAccessEmail: "operator@example.test",
        dateOfBirth: "1990-05-20",
        functions: ["operator"],
        gender: "F",
        address: "Rabat",
        name: "Safe Operator",
        phone: "+212600000000",
      } as CreateStaffDto,
      "admin-user",
    );

    expect(functionSets).toEqual([["operator"]]);
    expect(provisionCalls).toHaveLength(1);
    expect(provisionCalls[0]).toMatchObject({
      email: "operator@example.test",
      role: "operator",
    });
    expect(typeof result.initialPassword).toBe("string");
    expect(auditEvents.map((event) => event.action)).toEqual([
      "staff.operator_access_provisioned",
      "staff.created",
    ]);
  });

  it("deactivates a staff record, revokes user tokens, and audits only sanitized metadata", async () => {
    const profileUpdates: Record<string, unknown>[] = [];
    const userUpdates: Array<{ id: string; data: Record<string, unknown> }> = [];
    const invalidated: string[] = [];
    const revoked: string[] = [];
    const auditEvents: Record<string, unknown>[] = [];

    const service = new StaffService(
      {
        updateProfile: async (id: string, data: Partial<NewStaffProfile>) => {
          profileUpdates.push({ id, ...data });
          return makeStaffRecord({ status: data.status as StaffRecord["status"] });
        },
        findById: async () => makeStaffRecord({ status: "inactive" }),
        setFunctions: async () => undefined,
        deleteProfile: async () => undefined,
      } as unknown as StaffRepository,
      {} as unknown as AuthService,
      {
        update: async (id: string, data: Record<string, unknown>) => {
          userUpdates.push({ id, data });
          return { id, role: "operator" } as SanitizedUser;
        },
      } as unknown as UserService,
      {
        ensureExists: async () => makeStaffRecord(),
      } as unknown as StaffValidator,
      {
        record: async (event: Record<string, unknown>) => {
          auditEvents.push(event);
        },
      } as unknown as AuditService,
      {
        invalidateUserAccessTokens: async (id: string) => {
          invalidated.push(id);
        },
        revokeAllForUser: async (id: string) => {
          revoked.push(id);
        },
      } as unknown as TokenService,
      undefined,
    );

    await service.deactivate(
      staffId,
      { reason: "Operator left the programme" } as StaffStatusDto,
      "admin-user",
    );

    expect(profileUpdates).toEqual([{ id: staffId, status: "inactive" }]);
    expect(userUpdates).toEqual([
      { id: "operator-user", data: { status: "inactive" } },
    ]);
    expect(invalidated).toEqual(["operator-user"]);
    expect(revoked).toEqual(["operator-user"]);
    expect(auditEvents).toEqual([
      expect.objectContaining({
        action: "staff.deactivated",
        actorUserId: "admin-user",
        metadata: { reason: "Operator left the programme" },
      }),
    ]);
  });

  it("synchronizes a linked operator phone when Staff is edited", async () => {
    const authPhoneUpdates: Array<Record<string, unknown>> = [];
    const service = new StaffService(
      {
        findById: async () => makeStaffRecord(),
        setFunctions: async () => undefined,
        updateProfile: async () =>
          makeStaffRecord({ phone: "+212611111111" }),
      } as unknown as StaffRepository,
      {} as unknown as AuthService,
      { update: async () => makeStaffRecord() } as unknown as UserService,
      {
        ensureCanRemoveOperatorFunction: async () => undefined,
        ensureCinUnique: async () => undefined,
        ensureEmailUnique: async () => undefined,
        ensureExists: async () => makeStaffRecord(),
        ensurePhoneUnique: async () => undefined,
      } as unknown as StaffValidator,
      { record: async () => undefined } as unknown as AuditService,
      undefined,
      {
        update: async (_id: string, data: Record<string, unknown>) => {
          authPhoneUpdates.push(data);
          return makeStaffRecord();
        },
      } as unknown as UserRepository,
    );

    await service.update(
      staffId,
      {
        address: "Rabat",
        affiliation: "internal",
        cin: "AB123456",
        contactEmail: "operator@example.test",
        dateOfBirth: "1990-05-20",
        functions: ["operator"],
        gender: "F",
        name: "Safe Operator",
        phone: "+212611111111",
      },
      "admin-user",
    );

    expect(authPhoneUpdates).toEqual([
      { phone: "+212611111111", phoneVerified: false },
    ]);
  });

  it("refuses to permanently delete a staff record that has linked history", async () => {
    const isPristineCalls: string[] = [];
    const service = new StaffService(
      {
        isPristine: async (id: string) => {
          isPristineCalls.push(id);
          return false;
        },
        findById: async () => makeStaffRecord(),
        setFunctions: async () => undefined,
        updateProfile: async () => undefined,
        deleteProfile: async () => undefined,
      } as unknown as StaffRepository,
      {} as unknown as AuthService,
      {} as unknown as UserService,
      {
        ensureExists: async () => makeStaffRecord(),
      } as unknown as StaffValidator,
      { record: async () => undefined } as unknown as AuditService,
    );

    await expect(service.deletePristine(staffId, "admin-user")).rejects.toMatchObject({
      status: 409,
    });
    expect(isPristineCalls).toEqual([staffId]);
  });

  it("permanently deletes a staff record and its linked account when it has no delivery history", async () => {
    const deletedUserIds: string[] = [];
    const service = new StaffService(
      {
        isPristine: async () => true,
        deleteProfile: async () => makeStaffRecord(),
      } as unknown as StaffRepository,
      {} as unknown as AuthService,
      {
        delete: async (userId: string) => {
          deletedUserIds.push(userId);
          return makeStaffRecord();
        },
      } as unknown as UserService,
      {} as unknown as StaffValidator,
      { record: async () => undefined } as unknown as AuditService,
    );

    await expect(
      service.deletePristine(staffId, "admin-user"),
    ).resolves.toMatchObject({ id: staffId });
    expect(deletedUserIds).toEqual(["operator-user"]);
  });

  it("exports a privacy-safe delivery projection that omits private staff fields", async () => {
    const repository = {
      listDeliveryOptions: async (): Promise<DeliveryStaffOption[]> => [
        {
          affiliation: "internal",
          companyName: null,
          functionKeys: ["delivery"],
          id: staffId,
          image: null,
          name: "Safe Operator",
          phone: "+212600000000",
        },
      ],
    } as unknown as StaffRepository;
    const result = await repository.listDeliveryOptions();
    expect(result[0]).not.toHaveProperty("email");
    expect(result[0]).not.toHaveProperty("cin");
    expect(result[0]).not.toHaveProperty("address");
    expect(result[0]).not.toHaveProperty("notes");
  });
});
