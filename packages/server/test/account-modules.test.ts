import { describe, expect, it } from "bun:test";
import type {
  AuthService,
  SanitizedUser,
  UserService,
  UserValidator,
} from "najm-auth";
import {
  getMcpAnnotations,
  getMcpConfirmation,
  getMcpToolGroup,
  getMcpTools,
} from "najm-mcp";
import { getValidationConfig } from "najm-validation";

import {
  createOperatorDto,
  operatorIdParams,
  operatorListQuery,
  OperatorController,
  OperatorRepository,
  OperatorService,
  OperatorValidator,
  type UpdateOperatorDto,
  updateOperatorDto,
} from "../src/modules/operators";
import {
  createOwnSponsorProfileDto,
  createSponsorDto,
  sponsorIdParams,
  sponsorListQuery,
  sponsorStatusDto,
  SponsorController,
  SponsorRepository,
  SponsorService,
  SponsorValidator,
  updateOwnSponsorProfileDto,
  updateSponsorDto,
} from "../src/modules/sponsors";
import { AuditService } from "../src/modules/audit";

const operatorId = "00000000-0000-4000-8000-000000000001";
const sponsorId = "00000000-0000-4000-8000-000000000002";
const validAccount = {
  email: "account@example.test",
  password: "StrongPass1",
};
const validIdentity = {
  phone: "+212600000000",
  cin: "AB123456",
  gender: "F" as const,
  address: "Rabat",
  dateOfBirth: "1990-05-20",
};

describe("account module DTOs", () => {
  it("keeps profile fields and strips caller-controlled auth fields", () => {
    const operator = createOperatorDto.parse({
      ...validAccount,
      ...validIdentity,
      emailVerified: true,
      jobTitle: "Case reviewer",
      role: "sponsor",
      roleId: "role_sponsor",
      status: "active",
    });

    expect(operator).toMatchObject({
      email: validAccount.email,
      jobTitle: "Case reviewer",
    });
    expect(operator).not.toHaveProperty("emailVerified");
    expect(operator).not.toHaveProperty("password");
    expect(operator).not.toHaveProperty("role");
    expect(operator).not.toHaveProperty("roleId");
    expect(operator).not.toHaveProperty("status");

    expect(
      createSponsorDto.parse({
        ...validAccount,
        ...validIdentity,
        cin: "ab123456",
        countryCode: "MA",
        emailVerified: true,
        preferredLanguage: "fr",
        preferredCurrency: "MAD",
      role: "operator",
      roleId: "role_operator",
      status: "active",
      }),
    ).toMatchObject({
      cin: "AB123456",
      gender: "F",
      address: "Rabat",
      dateOfBirth: "1990-05-20",
    });
    const strippedSponsor = createSponsorDto.parse({
      ...validAccount,
      ...validIdentity,
      countryCode: "MA",
      preferredLanguage: "fr",
      preferredCurrency: "MAD",
    });
    expect(strippedSponsor).not.toHaveProperty("countryCode");
    expect(strippedSponsor).not.toHaveProperty("emailVerified");
    expect(strippedSponsor).not.toHaveProperty("password");
    expect(strippedSponsor).not.toHaveProperty("preferredLanguage");
    expect(strippedSponsor).not.toHaveProperty("preferredCurrency");
    expect(strippedSponsor).not.toHaveProperty("status");
    expect(createOperatorDto.safeParse(validAccount).success).toBe(false);
    expect(createSponsorDto.safeParse(validAccount).success).toBe(false);
  });

  it("strips password, verification, and role changes from updates", () => {
    expect(
      updateOperatorDto.parse({
        emailVerified: true,
        name: "Updated operator",
        password: "CallerChosen1",
        role: "sponsor",
        roleId: "role_sponsor",
        status: "active",
      }),
    ).toEqual({ name: "Updated operator" });
    expect(
      updateSponsorDto.parse({
        emailVerified: true,
        name: "Updated sponsor",
        password: "CallerChosen1",
        role: "operator",
        roleId: "role_operator",
        status: "inactive",
      }),
    ).toEqual({ name: "Updated sponsor" });
  });

  it("uses profile UUIDs and coerces pagination", () => {
    expect(operatorIdParams.parse({ id: operatorId })).toEqual({
      id: operatorId,
    });
    expect(sponsorIdParams.safeParse({ id: "najm-user-id" }).success).toBe(
      false,
    );
    expect(operatorListQuery.parse({ limit: "25", offset: "5" })).toEqual({
      limit: 25,
      offset: 5,
    });
    expect(sponsorListQuery.safeParse({ limit: "101" }).success).toBe(false);
  });
});

describe("account module controller validation", () => {
  it("exposes operator operations as guarded MCP tools", () => {
    expect(getMcpToolGroup(OperatorController)).toBe("operators");
    expect(getMcpTools(OperatorController).map((tool) => tool.methodKey)).toEqual([
      "list",
      "get",
      "create",
      "update",
      "delete",
    ]);
    expect(
      getMcpAnnotations(OperatorController.prototype.list)?.readOnlyHint,
    ).toBe(true);
    expect(
      getMcpConfirmation(OperatorController.prototype.delete),
    ).toMatchObject({ level: "danger" });
  });

  it("exposes sponsor onboarding, lifecycle, and admin deletion commands", () => {
    expect(getMcpToolGroup(SponsorController)).toBe("sponsors");
    expect(getMcpTools(SponsorController).map((tool) => tool.methodKey)).toEqual([
      "list",
      "getOwn",
      "get",
      "create",
      "createOwn",
      "update",
      "updateOwn",
      "delete",
      "deactivate",
      "reactivate",
    ]);
    expect(
      getMcpAnnotations(SponsorController.prototype.list)?.readOnlyHint,
    ).toBe(true);
    expect(
      getMcpConfirmation(SponsorController.prototype.deactivate),
    ).toMatchObject({ level: "danger" });
    expect(
      getMcpConfirmation(SponsorController.prototype.delete),
    ).toMatchObject({ level: "danger" });
  });

  it("binds validation to every operator route", () => {
    expect(
      getValidationConfig(OperatorController.prototype, "list")?.query,
    ).toBe(operatorListQuery);
    expect(
      getValidationConfig(OperatorController.prototype, "get")?.params,
    ).toBe(operatorIdParams);
    expect(
      getValidationConfig(OperatorController.prototype, "create")?.body,
    ).toBe(createOperatorDto);
    expect(
      getValidationConfig(OperatorController.prototype, "update"),
    ).toMatchObject({
      body: updateOperatorDto,
      params: operatorIdParams,
    });
    expect(
      getValidationConfig(OperatorController.prototype, "delete")?.params,
    ).toBe(operatorIdParams);
  });

  it("binds validation to every sponsor route", () => {
    expect(
      getValidationConfig(SponsorController.prototype, "list")?.query,
    ).toBe(sponsorListQuery);
    expect(
      getValidationConfig(SponsorController.prototype, "get")?.params,
    ).toBe(sponsorIdParams);
    expect(
      getValidationConfig(SponsorController.prototype, "create")?.body,
    ).toBe(createSponsorDto);
    expect(
      getValidationConfig(SponsorController.prototype, "update"),
    ).toMatchObject({
      body: updateSponsorDto,
      params: sponsorIdParams,
    });
    expect(
      getValidationConfig(SponsorController.prototype, "createOwn")?.body,
    ).toBe(createOwnSponsorProfileDto);
    expect(
      getValidationConfig(SponsorController.prototype, "updateOwn")?.body,
    ).toBe(updateOwnSponsorProfileDto);
    expect(
      getValidationConfig(SponsorController.prototype, "delete")?.params,
    ).toBe(sponsorIdParams);
    expect(
      getValidationConfig(SponsorController.prototype, "deactivate"),
    ).toMatchObject({
      body: sponsorStatusDto,
      params: sponsorIdParams,
    });
  });
});

describe("account module services", () => {
  it("creates an auth user and a Kafil operator profile", async () => {
    const accountCreates: Record<string, unknown>[] = [];
    const profileCreates: Record<string, unknown>[] = [];
    const auth = authService({
      provisionUser: async (input) => {
        accountCreates.push(input);
        return authAccount("operator-user", "operator");
      },
    });
    const profiles = operatorRepository({
      create: async (input) => {
        profileCreates.push(input);
        return operatorProfile();
      },
    });
    const service = new OperatorService(
      auth,
      userService({}),
      profiles,
      operatorValidator({
        ensureCinUnique: async () => {},
        ensureEmailUnique: async () => {},
        ensureIdUnique: async () => {},
        ensurePhoneUnique: async () => {},
        ensureUserIdUnique: async () => {},
      }),
    );

    expect(
      await service.create({
        ...validAccount,
        ...validIdentity,
        jobTitle: "Case reviewer",
      }),
    ).toMatchObject({
      id: operatorId,
      role: "operator",
      jobTitle: "Case reviewer",
    });
    expect(accountCreates).toEqual([
      {
        email: validAccount.email,
        role: "operator",
      },
    ]);
    expect(profileCreates).toEqual([
      expect.objectContaining({
        userId: "operator-user",
        ...validIdentity,
        jobTitle: "Case reviewer",
      }),
    ]);
  });

  it("lists persisted sponsor profiles instead of filtering paginated users", async () => {
    const listCalls: unknown[][] = [];
    const profiles = sponsorRepository({
      list: async (...args) => {
        listCalls.push(args);
        return [sponsorProfile()];
      },
    });
    const service = new SponsorService(
      authService({}),
      userService({}),
      profiles,
      auditService({}),
      sponsorValidator({}),
    );

    expect(await service.list({ limit: 25, offset: 5 })).toEqual([
      expect.objectContaining({ id: sponsorId, role: "sponsor" }),
    ]);
    expect(listCalls).toEqual([[25, 5]]);
  });

  it("permanently deletes an unreferenced sponsor login and profile, then audits the admin action", async () => {
    const deletedProfileIds: string[] = [];
    const deletedUserIds: string[] = [];
    const auditEvents: Record<string, unknown>[] = [];
    const service = new SponsorService(
      authService({}),
      userService({
        delete: async (userId) => {
          deletedUserIds.push(userId);
          return authAccount(userId, "sponsor");
        },
      }),
      sponsorRepository({
        delete: async (id) => {
          deletedProfileIds.push(id);
          return sponsorProfile();
        },
        hasLinkedHistory: async () => false,
      }),
      auditService({
        record: async (event) => {
          auditEvents.push(event);
        },
      }),
      sponsorValidator({ ensureExists: async () => sponsorProfile() }),
    );

    await expect(service.delete(sponsorId, "admin-user")).resolves.toMatchObject({
      id: sponsorId,
    });
    expect(deletedProfileIds).toEqual([sponsorId]);
    expect(deletedUserIds).toEqual(["sponsor-user"]);
    expect(auditEvents).toEqual([
      expect.objectContaining({
        action: "sponsor.deleted",
        actorUserId: "admin-user",
        resourceId: sponsorId,
        metadata: { permanent: true },
      }),
    ]);
  });

  it("refuses to permanently delete a sponsor with support or contribution history", async () => {
    const service = new SponsorService(
      authService({}),
      userService({}),
      sponsorRepository({ hasLinkedHistory: async () => true }),
      auditService({}),
      sponsorValidator({ ensureExists: async () => sponsorProfile() }),
    );

    await expect(service.delete(sponsorId, "admin-user")).rejects.toMatchObject({
      status: 409,
    });
  });

  it("creates a sponsor account with sponsor-owned identity fields", async () => {
    const accountCreates: Record<string, unknown>[] = [];
    const profileCreates: Record<string, unknown>[] = [];
    const service = new SponsorService(
      authService({
        provisionUser: async (input) => {
          accountCreates.push(input);
          return authAccount("sponsor-user", "sponsor");
        },
      }),
      userService({}),
      sponsorRepository({
        create: async (input) => {
          profileCreates.push(input);
          return sponsorProfile(input);
        },
      }),
      auditService({}),
      sponsorValidator({
        ensureCinUnique: async () => {},
        ensureEmailUnique: async () => {},
        ensureIdUnique: async () => {},
        ensurePhoneUnique: async () => {},
        ensureUserIdUnique: async () => {},
      }),
    );

    await service.create({
      ...validAccount,
      phone: "+212611111111",
      cin: "ab123456",
      gender: "M",
      address: "Casablanca",
      dateOfBirth: "1988-10-12",
    });

    expect(profileCreates).toEqual([
      expect.objectContaining({
        cin: "AB123456",
        gender: "M",
        address: "Casablanca",
        dateOfBirth: "1988-10-12",
      }),
    ]);
    expect(accountCreates).toEqual([
      expect.objectContaining({
        email: validAccount.email,
        role: "sponsor",
        password: expect.stringMatching(/^[A-Za-z]+1988!\d{4}$/),
      }),
    ]);
  });

  it("updates account and profile fields without allowing role changes", async () => {
    const accountUpdates: Record<string, unknown>[] = [];
    const profileUpdates: Record<string, unknown>[] = [];
    const users = userService({
      update: async (_id, input) => {
        accountUpdates.push(input);
        return authAccount("operator-user", "operator");
      },
    });
    const profiles = operatorRepository({
      findById: async () => operatorProfile(),
      update: async (_id, input) => {
        profileUpdates.push(input);
        return operatorProfile({ jobTitle: "Senior reviewer" });
      },
    });
    const service = new OperatorService(
      authService({}),
      users,
      profiles,
      operatorValidator({
        ensureCinUnique: async () => {},
        ensureEmailUnique: async () => {},
        ensureExists: async () => operatorProfile(),
        ensurePhoneUnique: async () => {},
      }),
    );

    await service.update(operatorId, {
      emailVerified: true,
      name: "Renamed",
      password: "CallerChosen1",
      jobTitle: "Senior reviewer",
      roleId: "role_sponsor",
    } as UpdateOperatorDto);

    expect(accountUpdates).toEqual([{ name: "Renamed" }]);
    expect(profileUpdates).toEqual([
      expect.objectContaining({ jobTitle: "Senior reviewer" }),
    ]);
  });

  it("rejects a profile whose joined auth role does not match the module", () => {
    const validator = new SponsorValidator(
      sponsorRepository({
        findById: async () => sponsorProfile({ role: "operator" }),
      }),
      userValidator({}),
    );

    expect(validator.ensureExists(sponsorId)).rejects.toMatchObject({
      status: 404,
    });
  });

  it("rejects duplicate operator phone numbers before persistence", () => {
    const validator = new OperatorValidator(
      operatorRepository({
        findByPhone: async () => operatorProfile(),
      }),
      userValidator({}),
    );

    expect(
      validator.ensurePhoneUnique("+212600000000"),
    ).rejects.toMatchObject({ status: 409 });
  });

  it("rejects duplicate operator CIN values before persistence", () => {
    const validator = new OperatorValidator(
      operatorRepository({
        findByCin: async () => operatorProfile(),
      }),
      userValidator({}),
    );

    expect(
      validator.ensureCinUnique("AB123456"),
    ).rejects.toMatchObject({ status: 409 });
  });

  it("rejects duplicate sponsor CIN values before persistence", () => {
    const validator = new SponsorValidator(
      sponsorRepository({
        findByCin: async () => sponsorProfile({ cin: "AB123456" }),
      }),
      userValidator({}),
    );

    expect(
      validator.ensureCinUnique("AB123456"),
    ).rejects.toMatchObject({ status: 409 });
  });
});

function authAccount(id: string, role: string): SanitizedUser {
  return { id, role } as SanitizedUser;
}

function operatorProfile(overrides: Record<string, unknown> = {}) {
  return {
    id: operatorId,
    userId: "operator-user",
    name: "Operator",
    email: "operator@example.test",
    image: null,
    emailVerified: true,
    status: "active",
    role: "operator",
    ...validIdentity,
    jobTitle: "Case reviewer",
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function sponsorProfile(overrides: Record<string, unknown> = {}) {
  return {
    id: sponsorId,
    userId: "sponsor-user",
    name: "Sponsor",
    email: "sponsor@example.test",
    image: null,
    emailVerified: true,
    status: "active",
    role: "sponsor",
    ...validIdentity,
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function authService(
  overrides: Partial<{
    provisionUser: (
      input: Record<string, unknown>,
    ) => Promise<SanitizedUser>;
  }>,
): AuthService {
  return overrides as unknown as AuthService;
}

function userService(
  overrides: Partial<{
    create: (input: Record<string, unknown>) => Promise<SanitizedUser>;
    update: (
      id: string,
      input: Record<string, unknown>,
    ) => Promise<SanitizedUser>;
    delete: (id: string) => Promise<SanitizedUser>;
  }>,
): UserService {
  return {
    create: overrides.create,
    update: overrides.update,
    delete: overrides.delete,
  } as unknown as UserService;
}

function auditService(
  overrides: Partial<{
    record: (input: Record<string, unknown>) => Promise<unknown>;
  }>,
): AuditService {
  return overrides as unknown as AuditService;
}

function operatorRepository(
  overrides: Partial<{
    list: (limit: number, offset: number) => Promise<unknown[]>;
    findById: (id: string) => Promise<ReturnType<typeof operatorProfile>>;
    findByPhone: (
      phone: string,
    ) => Promise<ReturnType<typeof operatorProfile>>;
    findByCin: (
      cin: string,
    ) => Promise<ReturnType<typeof operatorProfile>>;
    create: (
      input: Record<string, unknown>,
    ) => Promise<ReturnType<typeof operatorProfile>>;
    update: (
      id: string,
      input: Record<string, unknown>,
    ) => Promise<ReturnType<typeof operatorProfile>>;
    delete: (id: string) => Promise<ReturnType<typeof operatorProfile>>;
  }>,
): OperatorRepository {
  return overrides as unknown as OperatorRepository;
}

function sponsorRepository(
  overrides: Partial<{
    list: (limit: number, offset: number) => Promise<unknown[]>;
    findById: (id: string) => Promise<ReturnType<typeof sponsorProfile>>;
    findByPhone: (
      phone: string,
    ) => Promise<ReturnType<typeof sponsorProfile>>;
    findByCin: (
      cin: string,
    ) => Promise<ReturnType<typeof sponsorProfile>>;
    create: (
      input: Record<string, unknown>,
    ) => Promise<ReturnType<typeof sponsorProfile>>;
    update: (
      id: string,
      input: Record<string, unknown>,
    ) => Promise<ReturnType<typeof sponsorProfile>>;
    delete: (id: string) => Promise<ReturnType<typeof sponsorProfile>>;
    hasLinkedHistory: (id: string) => Promise<boolean>;
  }>,
): SponsorRepository {
  return overrides as unknown as SponsorRepository;
}

function operatorValidator(
  overrides: Partial<{
    ensureExists: (
      id: string,
    ) => Promise<ReturnType<typeof operatorProfile>>;
    ensureIdUnique: (id?: string) => Promise<void>;
    ensureUserIdUnique: (userId?: string) => Promise<void>;
    ensureEmailUnique: (
      email?: string,
      excludeUserId?: string,
    ) => Promise<void>;
    ensurePhoneUnique: (
      phone?: string | null,
      excludeId?: string,
    ) => Promise<void>;
    ensureCinUnique: (
      cin?: string | null,
      excludeId?: string,
    ) => Promise<void>;
  }>,
): OperatorValidator {
  return overrides as unknown as OperatorValidator;
}

function sponsorValidator(
  overrides: Partial<{
    ensureExists: (
      id: string,
    ) => Promise<ReturnType<typeof sponsorProfile>>;
    ensureIdUnique: (id?: string) => Promise<void>;
    ensureUserIdUnique: (userId?: string) => Promise<void>;
    ensureEmailUnique: (
      email?: string,
      excludeUserId?: string,
    ) => Promise<void>;
    ensurePhoneUnique: (
      phone?: string | null,
      excludeId?: string,
    ) => Promise<void>;
    ensureCinUnique: (
      cin?: string | null,
      excludeId?: string,
    ) => Promise<void>;
  }>,
): SponsorValidator {
  return overrides as unknown as SponsorValidator;
}

function userValidator(
  overrides: Partial<{
    checkEmailUnique: (email: string, excludeId?: string) => Promise<void>;
    checkUserIdIsUnique: (id: string) => Promise<void>;
  }>,
): UserValidator {
  return overrides as unknown as UserValidator;
}
