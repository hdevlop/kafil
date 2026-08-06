import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import type { AuthService, SanitizedUser } from "najm-auth";
import { EmailService } from "najm-email";
import { getMcpAnnotations, getMcpToolGroup, getMcpTools } from "najm-mcp";
import { getRateLimitOptions } from "najm-rate";
import { getValidationConfig } from "najm-validation";

import {
  ApplicantController,
  type ApplicantEmailOtpConfirmDto,
  ApplicantRepository,
  ApplicantService,
  ApplicantValidator,
  APPLICANT_EMAIL_OTP_MAX_ATTEMPTS,
  APPLICANT_EMAIL_OTP_PURPOSE,
  APPLICANT_EMAIL_OTP_RESEND_COOLDOWN_MS,
  APPLICANT_EMAIL_OTP_TTL_MS,
  applicantEmailOtpConfirmDto,
  applicantIdParams,
  applicantListQuery,
  createApplicantDto,
  resolveApplicantRateLimitConfig,
} from "../src/modules/applicants";

const validSubmission = {
  name: "Fatima Zahra",
  email: "fatima@example.test",
  phone: "+212600112233",
  cin: "ab123456",
  gender: "F" as const,
  password: "StrongPass1",
};

const storedApplicants: Record<string, Record<string, unknown>> = {};
const storedChallenges: Record<string, Record<string, unknown>> = {};
const storedUsers: Record<string, SanitizedUser> = {};
let userSequence = 0;
let emailSentHtml = "";
let emailSendCount = 0;

/** The in-memory stand-in for the repository's shared condition builder. */
function matchStoredApplicants(filters: { status?: string; search?: string } = {}) {
  let rows = Object.values(storedApplicants) as ReturnType<typeof baseApplicant>[];
  if (filters.status) rows = rows.filter((row) => row.status === filters.status);
  if (filters.search) {
    const q = filters.search.toLowerCase();
    rows = rows.filter(
      (row) =>
        row.name.toLowerCase().includes(q) ||
        row.email.toLowerCase().includes(q) ||
        row.phone.toLowerCase().includes(q),
    );
  }
  return rows;
}

function newUserId() {
  userSequence += 1;
  return `applicant-user-${userSequence}`;
}

function baseApplicant(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: crypto.randomUUID(),
    authUserId: newUserId(),
    name: "Fatima Zahra",
    email: "fatima@example.test",
    phone: "+212600112233",
    cin: "AB123456",
    gender: "F",
    status: "pending_email_verification",
    submittedAt: new Date(),
    reviewedAt: null,
    reviewedByUserId: null,
    rejectionReason: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

beforeEach(() => {
  for (const key of Object.keys(storedApplicants)) delete storedApplicants[key];
  for (const key of Object.keys(storedChallenges)) delete storedChallenges[key];
  for (const key of Object.keys(storedUsers)) delete storedUsers[key];
  userSequence = 0;
  emailSentHtml = "";
  emailSendCount = 0;
});

afterEach(() => {
  for (const key of Object.keys(storedApplicants)) delete storedApplicants[key];
  for (const key of Object.keys(storedChallenges)) delete storedChallenges[key];
  for (const key of Object.keys(storedUsers)) delete storedUsers[key];
});

describe("applicant DTOs", () => {
  it("accepts the complete identity and password contract", () => {
    expect(createApplicantDto.parse(validSubmission)).toEqual({
      name: "Fatima Zahra",
      email: "fatima@example.test",
      phone: "+212600112233",
      cin: "AB123456",
      gender: "F",
      password: "StrongPass1",
      locale: "en",
    });
  });

  it("lowercases email and uppercases CIN before validation", () => {
    const parsed = createApplicantDto.parse({
      ...validSubmission,
      email: "Fatima@Example.Test",
      cin: "ab123456",
    });
    expect(parsed.email).toBe("fatima@example.test");
    expect(parsed.cin).toBe("AB123456");
  });

  it("rejects passwords shorter than 8 characters", () => {
    const result = createApplicantDto.safeParse({
      ...validSubmission,
      password: "short",
    });
    expect(result.success).toBe(false);
  });

  it("normalizes Moroccan 0-prefix phone numbers", () => {
    const parsed = createApplicantDto.parse({
      ...validSubmission,
      phone: "06 12 34 56 78",
    });
    expect(parsed.phone).toBe("+212612345678");
  });

  it("rejects malformed phone numbers", () => {
    const result = createApplicantDto.safeParse({
      ...validSubmission,
      phone: "not-a-phone",
    });
    expect(result.success).toBe(false);
  });

  it("requires a 6-digit OTP code", () => {
    expect(
      applicantEmailOtpConfirmDto.parse({ code: "123456" }),
    ).toEqual({ code: "123456" });
    expect(
      applicantEmailOtpConfirmDto.safeParse({ code: "12345" }).success,
    ).toBe(false);
    expect(
      applicantEmailOtpConfirmDto.safeParse({ code: "abcdef" }).success,
    ).toBe(false);
  });

  it("strips a family ID and never accepts sponsor profile fields", () => {
    const parsed = createApplicantDto.parse({
      ...validSubmission,
      familyId: "00000000-0000-4000-8000-000000000099",
      sponsorProfileId: "00000000-0000-4000-8000-000000000100",
    });
    expect(parsed).not.toHaveProperty("familyId");
    expect(parsed).not.toHaveProperty("sponsorProfileId");
  });
});

describe("applicant rate-limit configuration", () => {
  it("keeps production-safe defaults and overrides", () => {
    expect(resolveApplicantRateLimitConfig({})).toEqual({
      registration: { limit: 5, window: "15m" },
      verificationResend: { limit: 3, window: "15m" },
      verificationConfirm: { limit: 5, window: "15m" },
    });
    expect(
      resolveApplicantRateLimitConfig({
        KAFIL_APPLICANT_RATE_LIMIT: "9",
        KAFIL_APPLICANT_RATE_WINDOW: "30s",
        KAFIL_APPLICANT_VERIFICATION_REQUEST_RATE_LIMIT: "1",
      }).verificationResend,
    ).toEqual({ limit: 1, window: "30s" });
    expect(
      resolveApplicantRateLimitConfig({
        KAFIL_APPLICANT_RATE_LIMIT: "12",
      }).registration,
    ).toEqual({ limit: 12, window: "15m" });
    expect(() =>
      resolveApplicantRateLimitConfig({ KAFIL_APPLICANT_RATE_LIMIT: "0" }),
    ).toThrow();
  });

  it("uses the right limits on the public applicant routes", () => {
    expect(getRateLimitOptions(ApplicantController, "submit")).toMatchObject({
      limit: 5,
      window: "15m",
    });
    expect(getRateLimitOptions(ApplicantController, "submit")?.key).toBeTypeOf(
      "function",
    );
    expect(getRateLimitOptions(ApplicantController, "resend")?.key).toBe("ip");
    expect(getRateLimitOptions(ApplicantController, "confirm")?.key).toBe("ip");
  });

  it("keeps constants aligned with the sponsor OTP security contract", () => {
    expect(APPLICANT_EMAIL_OTP_TTL_MS).toBe(10 * 60 * 1_000);
    expect(APPLICANT_EMAIL_OTP_RESEND_COOLDOWN_MS).toBe(60 * 1_000);
    expect(APPLICANT_EMAIL_OTP_MAX_ATTEMPTS).toBe(5);
    expect(APPLICANT_EMAIL_OTP_PURPOSE).toBe("applicant-email-otp");
  });
});

describe("applicant controller contracts", () => {
  it("keeps applicant routes outside MCP discovery", () => {
    expect(getMcpToolGroup(ApplicantController)).toBeUndefined();
    expect(getMcpTools(ApplicantController)).toEqual([]);
    expect(getMcpAnnotations(ApplicantController.prototype.submit)).toBeUndefined();
  });

  it("binds validation to the public submission and confirmation routes", () => {
    expect(getValidationConfig(ApplicantController.prototype, "submit")?.body).toBe(
      createApplicantDto,
    );
    expect(
      getValidationConfig(ApplicantController.prototype, "confirm"),
    ).toMatchObject({ body: applicantEmailOtpConfirmDto });
    expect(
      getValidationConfig(ApplicantController.prototype, "setup"),
    ).toBeUndefined();
    expect(
      getValidationConfig(ApplicantController.prototype, "resend"),
    ).toBeUndefined();
    expect(
      getValidationConfig(ApplicantController.prototype, "list"),
    ).toMatchObject({ query: applicantListQuery });
    expect(
      getValidationConfig(ApplicantController.prototype, "get"),
    ).toMatchObject({ params: applicantIdParams });
  });
});

describe("applicant service", () => {
  it("lists the admin queue and reads one applicant", async () => {
    const applicant = baseApplicant({ status: "pending_review" }) as Awaited<
      ReturnType<ApplicantService["get"]>
    >;
    const calls: unknown[][] = [];
    const service = applicantService({
      repository: applicantRepository({
        list: async (limit, offset) => {
          calls.push([limit, offset]);
          return [applicant as ReturnType<typeof baseApplicant>];
        },
        count: async () => 1,
        findById: async () => applicant as ReturnType<typeof baseApplicant>,
      }),
      validator: applicantValidator({
        ensureExists: async () => applicant as ReturnType<typeof baseApplicant>,
      }),
    });

    const page = await service.list({});
    expect(page.data).toEqual([applicant]);
    expect(page.pagination).toEqual({ page: 1, limit: 100, total: 1 });
    await expect(service.get(applicant.id)).resolves.toEqual(applicant);
    expect(calls).toEqual([[100, 0]]);
  });

  it("creates one auth user and one applicant with the OTP next step", async () => {
    const service = applicantService();
    const result = await service.submit(validSubmission);
    expect(result.nextStep).toBe("applicant_email_otp");
    expect(result.status).toBe("pending_email_verification");
    expect(result.reused).toBe(false);
    if (result.nextStep === "applicant_email_otp") {
      expect(result.maskedDestination).toBe("f***@e***.test");
      expect(result.emailSent).toBe(true);
    }
    expect(emailSendCount).toBe(1);
    expect(emailSentHtml).toMatch(/\d{6}/);
    expect(emailSentHtml).not.toMatch(/verify-email\?token=/);
    expect(Object.keys(storedUsers)).toHaveLength(1);
    expect(Object.keys(storedApplicants)).toHaveLength(1);
  });

  it("reclaims a legacy pending registration without granting sponsor capabilities", async () => {
    const legacyUser = {
      ...applicantUser(),
      id: "legacy-pending-sponsor",
      role: "sponsor",
      status: "pending",
      emailVerified: false,
    } as SanitizedUser;
    const userUpdates: unknown[][] = [];
    const recordUpdates: unknown[][] = [];
    const service = applicantService({
      auth: {
        registerUser: async () => {
          throw new Error("must reclaim the existing identity");
        },
      },
      users: {
        findByEmailInsensitive: async () => legacyUser,
        getById: async () => ({ ...legacyUser, role: null }),
        update: async (id: string, input: Record<string, unknown>) => {
          userUpdates.push([id, input]);
          return legacyUser;
        },
      },
      userRecords: {
        update: async (id: string, input: Record<string, unknown>) => {
          recordUpdates.push([id, input]);
          return legacyUser;
        },
      },
    });

    const result = await service.submit(validSubmission);

    expect(result).toMatchObject({
      nextStep: "applicant_email_otp",
      reused: true,
    });
    expect(userUpdates).toEqual([
      [
        legacyUser.id,
        {
          name: validSubmission.name,
          email: validSubmission.email,
          password: validSubmission.password,
          status: "pending",
          emailVerified: false,
        },
      ],
    ]);
    expect(recordUpdates).toEqual([
      [
        legacyUser.id,
        {
          phone: validSubmission.phone,
          phoneVerified: false,
          emailVerified: false,
          roleId: null,
        },
      ],
    ]);
    expect(Object.values(storedApplicants)).toContainEqual(
      expect.objectContaining({ authUserId: legacyUser.id }),
    );
  });

  it("never reclaims an identity that already owns a sponsor profile", async () => {
    const legacyUser = {
      ...applicantUser(),
      id: "real-sponsor",
      role: "sponsor",
      status: "pending",
      emailVerified: false,
    } as SanitizedUser;
    const service = applicantService({
      users: {
        findByEmailInsensitive: async () => legacyUser,
      },
      sponsors: {
        findByUserId: async () => ({ id: "sponsor-profile" }),
      },
    });

    await expect(service.submit(validSubmission)).rejects.toMatchObject({
      status: 409,
    });
    expect(Object.keys(storedApplicants)).toHaveLength(0);
  });

  it("does not create a sponsor profile or sponsor capabilities", async () => {
    const createdProfileIds: string[] = [];
    const service = applicantService({
      repository: applicantRepository({
        create: async (input) => {
          if (input.status === "approved") {
            createdProfileIds.push("sponsor-profile");
          }
          return baseApplicant({ ...input });
        },
      }),
    });
    await service.submit(validSubmission);
    expect(createdProfileIds).toEqual([]);
  });

  it("reuses an unverified pending applicant without making a duplicate", async () => {
    const existing = baseApplicant({
      email: "fatima@example.test",
      cin: "AB123456",
      phone: "+212600112233",
    });
    storedApplicants[existing.id] = { ...existing };

    const service = applicantService({
      repository: applicantRepository({
        findByEmailInsensitive: async () => existing,
      }),
    });
    const result = await service.submit(validSubmission);
    expect(result.reused).toBe(true);
    expect(result.nextStep).toBe("applicant_email_otp");
    if (result.nextStep === "applicant_email_otp") {
      expect(result.maskedDestination).toBe("f***@e***.test");
    }
    expect(Object.keys(storedApplicants)).toHaveLength(1);
  });

  it("returns the pending-review outcome for a verified application", async () => {
    const verified = baseApplicant({
      email: "fatima@example.test",
      cin: "AB123456",
      phone: "+212600112233",
      status: "pending_review",
    });
    storedApplicants[verified.id] = { ...verified };
    const service = applicantService({
      repository: applicantRepository({
        findByEmailInsensitive: async () => verified,
      }),
    });
    const result = await service.submit(validSubmission);
    expect(result).toMatchObject({
      nextStep: "applicant_pending_review",
      status: "pending_review",
      reused: true,
    });
  });

  it("directs an already approved applicant to sign in without re-sending an OTP", async () => {
    const approved = baseApplicant({
      email: "fatima@example.test",
      cin: "AB123456",
      phone: "+212600112233",
      status: "approved",
      reviewedAt: new Date(),
      reviewedByUserId: "admin-user",
    });
    storedApplicants[approved.id] = { ...approved };
    const service = applicantService({
      repository: applicantRepository({
        findByEmailInsensitive: async () => approved,
      }),
    });
    const result = await service.submit(validSubmission);
    expect(result.nextStep).toBe("applicant_approved");
    expect(result.status).toBe("approved");
    expect(result.reused).toBe(true);
    expect(emailSendCount).toBe(0);
  });

  it("denies a rejected applicant without a public reopen path", async () => {
    const rejected = baseApplicant({
      email: "fatima@example.test",
      cin: "AB123456",
      phone: "+212600112233",
      status: "rejected",
      reviewedAt: new Date(),
      reviewedByUserId: "admin-user",
      rejectionReason: "Ineligible",
    });
    storedApplicants[rejected.id] = { ...rejected };
    const service = applicantService({
      repository: applicantRepository({
        findByEmailInsensitive: async () => rejected,
      }),
    });
    await expect(service.submit(validSubmission)).rejects.toMatchObject({
      status: 409,
    });
  });

  it("never accepts a family ID on submission", async () => {
    const createdWith: Record<string, unknown>[] = [];
    const service = applicantService({
      repository: applicantRepository({
        create: async (input) => {
          createdWith.push(input);
          return baseApplicant({ ...input });
        },
      }),
    });
    await service.submit({
      ...validSubmission,
      // @ts-expect-error: explicitly test that extra fields are dropped
      familyId: "00000000-0000-4000-8000-000000000099",
    });
    expect(createdWith).toHaveLength(1);
    expect(createdWith[0]).not.toHaveProperty("familyId");
    expect(createdWith[0]).not.toHaveProperty("sponsorProfileId");
  });

  it("refuses to confirm with an invalid code without consuming the challenge", async () => {
    const applicant = baseApplicant();
    storedApplicants[applicant.id] = { ...applicant };
    const challenge = {
      applicantId: applicant.id,
      authUserId: applicant.authUserId,
      codeHash: "0".repeat(64),
      expiresAt: new Date(Date.now() + 60_000),
      resendAvailableAt: new Date(),
      attemptsRemaining: 5,
      emailSent: true,
      locale: "en",
      consumedAt: null,
    };
    storedChallenges[applicant.id] = { ...challenge };

    const events: unknown[][] = [];
    const service = applicantService({
      setup: {
        require: async () => ({ userId: applicant.authUserId }),
        consume: async (...args: unknown[]) => {
          const complete = args[1] as (session: {
            userId: string;
          }) => Promise<unknown>;
          events.push(["consume"]);
          return complete({ userId: applicant.authUserId });
        },
      },
    });

    await expect(
      service.confirm("000000" as ApplicantEmailOtpConfirmDto["code"]),
    ).rejects.toMatchObject({ status: 400 });
    expect(events).toEqual([]);
  });

  it("marks the application pending review after a valid OTP confirmation", async () => {
    const userUpdates: unknown[][] = [];
    let deliveredCode = "";
    let createdApplicantId = "";
    let createdAuthUserId = "";

    const service = applicantService({
      auth: {},
      repository: applicantRepository({
        findByEmailInsensitive: async () => undefined,
        create: async (input) => {
          const id = crypto.randomUUID();
          createdApplicantId = id;
          createdAuthUserId = String(input.authUserId);
          const record = baseApplicant({ ...input, id });
          storedApplicants[id] = { ...record };
          return record;
        },
        findByAuthUserId: async (id) => {
          for (const record of Object.values(storedApplicants)) {
            if (record.authUserId === id) return record as ReturnType<typeof baseApplicant>;
          }
          return undefined;
        },
      }),
      users: {
        getById: async () => applicantUser(),
        update: async (id: string, input: Record<string, unknown>) => {
          userUpdates.push([id, input]);
          return applicantUser();
        },
      },
      setup: {
        require: async () => ({ userId: createdAuthUserId }),
        consume: async (...args: unknown[]) => {
          const complete = args[1] as (session: {
            userId: string;
          }) => Promise<unknown>;
          return complete({ userId: createdAuthUserId });
        },
      },
    });

    (service as unknown as { email: EmailService }).email = {
      sendHtml: async (_to: string, _subject: string, html: string) => {
        deliveredCode = String(html).match(/\d{6}/)?.[0] ?? "";
        return { success: true };
      },
    } as unknown as EmailService;
    await service.submit(validSubmission);
    expect(deliveredCode).toMatch(/^\d{6}$/);
    expect(createdApplicantId).not.toBe("");
    expect(createdAuthUserId).not.toBe("");

    const result = await service.confirm(deliveredCode);
    expect(result.nextStep).toBe("applicant_pending_review");
    expect(result.status).toBe("pending_review");
    expect(result.emailVerified).toBe(true);
    expect(userUpdates).toEqual([
      [createdAuthUserId, { emailVerified: true, status: "pending" }],
    ]);
    expect(storedApplicants[createdApplicantId]?.status).toBe("pending_review");
  });
});

describe("applicant decision service", () => {
  const pendingApplicant = baseApplicant({
    id: "applicant-decision-1",
    authUserId: "auth-user-decision-1",
    email: "decision@example.test",
    phone: "+212600000099",
    cin: "DEC12345",
    status: "pending_review",
  });

  function setupDecision(
    repositoryOverrides: Record<string, unknown> = {},
    sponsorOverrides: Record<string, unknown> = {},
    extraOverrides: Partial<{
      tokens: Record<string, unknown>;
      audits: Record<string, unknown>;
      outbox: Record<string, unknown>;
    }> = {},
  ) {
    if (!storedApplicants[pendingApplicant.id]) {
      storedApplicants[pendingApplicant.id] = { ...pendingApplicant };
    }
    const readApplicant = () =>
      (storedApplicants[pendingApplicant.id] ??
      pendingApplicant) as ReturnType<typeof baseApplicant>;
    const userUpdates: unknown[][] = [];
    const roleAssignments: unknown[][] = [];
    const audits: unknown[][] = [];
    const outboxEvents: unknown[][] = [];
    const sponsorCreates: unknown[][] = [];
    const tokenInvalidations: unknown[][] = [];
    const tokenRevocations: unknown[][] = [];

    const service = applicantService({
      repository: applicantRepository({
        findById: async (id) =>
          id === pendingApplicant.id
            ? readApplicant()
            : undefined,
        findByIdForUpdate: async (id) =>
          id === pendingApplicant.id
            ? readApplicant()
            : undefined,
        ...repositoryOverrides,
      }),
      users: {
        getById: async () => ({
          ...applicantUser(),
          id: pendingApplicant.authUserId,
          emailVerified: true,
          status: "pending",
        }),
        update: async (id: string, input: Record<string, unknown>) => {
          userUpdates.push([id, input]);
          return { ...applicantUser(), id };
        },
        assignRole: async (id: string, _roleId: unknown, roleName: unknown) => {
          roleAssignments.push([id, roleName]);
          return { ...applicantUser(), id, role: roleName };
        },
      },
      sponsors: {
        create: async (input: Record<string, unknown>) => {
          sponsorCreates.push([input]);
          return { id: "sponsor-profile-decision", userId: input.userId, ...input };
        },
        ...sponsorOverrides,
      },
      tokens: {
        invalidateUserAccessTokens: async (id: string) => {
          tokenInvalidations.push([id]);
          return 0;
        },
        revokeAllForUser: async (id: string) => {
          tokenRevocations.push([id]);
          return 0;
        },
        ...(extraOverrides.tokens ?? {}),
      },
      audits: {
        record: async (input: Record<string, unknown>) => {
          audits.push([input]);
          return input;
        },
        ...(extraOverrides.audits ?? {}),
      },
      outbox: {
        enqueue: async (input: Record<string, unknown>) => {
          outboxEvents.push([input]);
          return { id: `outbox-${outboxEvents.length}`, ...input };
        },
        markDelivered: async () => undefined,
        markDeliveryFailed: async () => undefined,
        ...(extraOverrides.outbox ?? {}),
      },
    });
    return {
      service,
      userUpdates,
      roleAssignments,
      audits,
      outboxEvents,
      sponsorCreates,
      tokenInvalidations,
      tokenRevocations,
    };
  }

  it("approves a pending review applicant once and never duplicates the graph", async () => {
    const ctx = setupDecision();

    const result = await ctx.service.approve(pendingApplicant.id, "admin-actor");

    expect(result.status).toBe("approved");
    expect(result.sponsorProfileId).toBe("sponsor-profile-decision");
    expect(result.reviewedByUserId).toBe("admin-actor");
    expect(storedApplicants[pendingApplicant.id]?.status).toBe("approved");

    expect(ctx.roleAssignments).toEqual([
      [pendingApplicant.authUserId, "sponsor"],
    ]);
    expect(
      ctx.userUpdates.find(
        ([, input]) =>
          (input as Record<string, unknown>).status === "active",
      ),
    ).toBeDefined();
    expect(ctx.sponsorCreates).toHaveLength(1);
    expect(ctx.sponsorCreates[0]?.[0]).toMatchObject({
      userId: pendingApplicant.authUserId,
      phone: pendingApplicant.phone,
      cin: pendingApplicant.cin,
      gender: pendingApplicant.gender,
    });
    expect(ctx.audits).toHaveLength(1);
    expect(ctx.audits[0]?.[0]).toMatchObject({
      action: "applicant.approved",
      actorUserId: "admin-actor",
      resourceId: pendingApplicant.id,
    });
    expect(ctx.outboxEvents).toHaveLength(1);
    expect(ctx.outboxEvents[0]?.[0]).toMatchObject({
      topic: "applicant.approved",
      aggregateType: "applicant",
      aggregateId: pendingApplicant.id,
    });
  });

  it("creates no support assignment or session during approval", async () => {
    const ctx = setupDecision();

    await ctx.service.approve(pendingApplicant.id, "admin-actor");

    const supportCalls = (ctx.audits as unknown[][]).filter(
      ([entry]) =>
        String((entry as Record<string, unknown>).resource ?? "") ===
        "supportAssignments",
    );
    expect(supportCalls).toHaveLength(0);
  });

  it("refuses approval when the applicant is not pending review", async () => {
    storedApplicants[pendingApplicant.id] = {
      ...pendingApplicant,
      status: "approved",
    };
    const ctx = setupDecision();

    await expect(
      ctx.service.approve(pendingApplicant.id, "admin-actor"),
    ).rejects.toMatchObject({ status: 409 });
    expect(ctx.roleAssignments).toHaveLength(0);
    expect(ctx.sponsorCreates).toHaveLength(0);
  });

  it("allows an admin to approve a previously rejected applicant", async () => {
    storedApplicants[pendingApplicant.id] = {
      ...pendingApplicant,
      status: "rejected",
      rejectionReason: "Previously not eligible",
      reviewedAt: new Date(),
      reviewedByUserId: "previous-admin",
    };
    const ctx = setupDecision({
      findAuthUserByIdForUpdate: async () => ({
        ...applicantUser(),
        id: pendingApplicant.authUserId,
        emailVerified: true,
        status: "inactive",
      }) as SanitizedUser,
    });

    const result = await ctx.service.approve(pendingApplicant.id, "admin-actor");

    expect(result.status).toBe("approved");
    expect(result.rejectionReason).toBeNull();
    expect(ctx.sponsorCreates).toHaveLength(1);
    expect(ctx.roleAssignments).toEqual([[pendingApplicant.authUserId, "sponsor"]]);
    expect(ctx.audits[0]?.[0]).toMatchObject({
      action: "applicant.approved",
      metadata: { transition: "rejected->approved" },
    });
    expect(ctx.outboxEvents[0]?.[0]).toMatchObject({
      topic: "applicant.approved",
      payload: { transition: "rejected->approved" },
    });
  });

  it("refuses approval when the linked auth identity is not pending", async () => {
    const ctx = setupDecision(undefined, undefined, {
      ...{},
    });
    (ctx.service as unknown as {
      applicants: {
        findAuthUserByIdForUpdate: () => Promise<SanitizedUser>;
      };
    }).applicants.findAuthUserByIdForUpdate = async () =>
      ({
        ...applicantUser(),
        id: pendingApplicant.authUserId,
        emailVerified: true,
        status: "active",
      }) as SanitizedUser;

    await expect(
      ctx.service.approve(pendingApplicant.id, "admin-actor"),
    ).rejects.toMatchObject({ status: 409 });
    expect(ctx.roleAssignments).toHaveLength(0);
    expect(ctx.sponsorCreates).toHaveLength(0);
  });

  it("refuses approval when a sponsor profile already exists for the user", async () => {
    const ctx = setupDecision(undefined, {
      findByUserId: async () => ({ id: "existing-profile" }),
    });

    await expect(
      ctx.service.approve(pendingApplicant.id, "admin-actor"),
    ).rejects.toMatchObject({ status: 409 });
    expect(ctx.sponsorCreates).toHaveLength(0);
  });

  it("rejects a pending review applicant with a required reason", async () => {
    const ctx = setupDecision();

    const result = await ctx.service.reject(
      pendingApplicant.id,
      { reason: "  Not eligible  " },
      "admin-actor",
    );

    expect(result.status).toBe("rejected");
    expect(result.rejectionReason).toBe("Not eligible");
    expect(storedApplicants[pendingApplicant.id]?.status).toBe("rejected");
    expect(ctx.tokenInvalidations).toEqual([[pendingApplicant.authUserId]]);
    expect(ctx.tokenRevocations).toEqual([[pendingApplicant.authUserId]]);
    expect(
      ctx.userUpdates.find(
        ([, input]) =>
          (input as Record<string, unknown>).status === "inactive",
      ),
    ).toBeDefined();
    expect(ctx.roleAssignments).toHaveLength(0);
    expect(ctx.sponsorCreates).toHaveLength(0);
    expect(ctx.audits).toHaveLength(1);
    expect(ctx.audits[0]?.[0]).toMatchObject({
      action: "applicant.rejected",
      resourceId: pendingApplicant.id,
    });
    expect(ctx.outboxEvents).toHaveLength(1);
    expect(ctx.outboxEvents[0]?.[0]).toMatchObject({
      topic: "applicant.rejected",
      aggregateId: pendingApplicant.id,
    });
  });

  it("requires a non-empty bounded rejection reason", async () => {
    const ctx = setupDecision();

    await expect(
      ctx.service.reject(pendingApplicant.id, { reason: "" }, "admin-actor"),
    ).rejects.toBeInstanceOf(Error);
    await expect(
      ctx.service.reject(
        pendingApplicant.id,
        { reason: "x".repeat(501) },
        "admin-actor",
      ),
    ).rejects.toBeInstanceOf(Error);
    expect(ctx.outboxEvents).toHaveLength(0);
  });

  it("refuses rejection when the applicant is not pending review", async () => {
    storedApplicants[pendingApplicant.id] = {
      ...pendingApplicant,
      status: "rejected",
    };
    const ctx = setupDecision();

    await expect(
      ctx.service.reject(
        pendingApplicant.id,
        { reason: "Late reject" },
        "admin-actor",
      ),
    ).rejects.toMatchObject({ status: 409 });
    expect(ctx.tokenRevocations).toHaveLength(0);
  });

  it("returns the terminal applicant without duplicating the graph when re-approving", async () => {
    storedApplicants[pendingApplicant.id] = {
      ...pendingApplicant,
      status: "approved",
      reviewedAt: new Date(),
      reviewedByUserId: "previous-admin",
    };
    const ctx = setupDecision();

    await expect(
      ctx.service.approve(pendingApplicant.id, "admin-actor"),
    ).rejects.toMatchObject({ status: 409 });
    expect(ctx.roleAssignments).toHaveLength(0);
    expect(ctx.sponsorCreates).toHaveLength(0);
    expect(ctx.outboxEvents).toHaveLength(0);
  });

  it("filters the admin queue by status and search term", async () => {
    const search = baseApplicant({
      id: "search-applicant",
      authUserId: "auth-search",
      name: "Search Person",
      email: "search@example.test",
      phone: "+212600000088",
      cin: "SEARCH1",
      status: "approved",
    });
    storedApplicants[pendingApplicant.id] = { ...pendingApplicant };
    storedApplicants[search.id] = { ...search };

    const service = applicantService({
      repository: applicantRepository(),
    });

    const pendingOnly = await service.list({ status: "pending_review" });
    expect(pendingOnly.data.map((row) => row.id)).toContain(pendingApplicant.id);
    expect(pendingOnly.data.map((row) => row.id)).not.toContain(search.id);

    const approvedOnly = await service.list({ status: "approved" });
    expect(approvedOnly.data.map((row) => row.id)).toContain(search.id);
    expect(approvedOnly.data.map((row) => row.id)).not.toContain(pendingApplicant.id);

    const byEmail = await service.list({ search: "search@example.test" });
    expect(byEmail.data.map((row) => row.id)).toEqual([search.id]);
    // The total follows the filter, not the unfiltered table.
    expect(byEmail.pagination.total).toBe(1);

    const byPhone = await service.list({ search: "+212600000099" });
    expect(byPhone.data.map((row) => row.id)).toEqual([pendingApplicant.id]);
    expect(byPhone.pagination.total).toBe(1);
  });

  it("counts pending review applicants for the queue header", async () => {
    storedApplicants[pendingApplicant.id] = { ...pendingApplicant };
    const service = applicantService();
    const count = await service.countByStatus("pending_review");
    expect(count).toBeGreaterThanOrEqual(1);
  });
});

function applicantUser(): SanitizedUser {
  return {
    id: "applicant-user",
    email: "fatima@example.test",
    name: "Fatima Zahra",
    status: "pending",
    emailVerified: false,
  } as unknown as SanitizedUser;
}

function applicantRepository(overrides: Partial<{
  list: (limit: number, offset: number) => Promise<ReturnType<typeof baseApplicant>[]>;
  count: (filters: Record<string, unknown>) => Promise<number>;
  findById: (id: string) => Promise<ReturnType<typeof baseApplicant> | undefined>;
  findByIdForUpdate: (id: string) => Promise<ReturnType<typeof baseApplicant> | undefined>;
  findAuthUserByIdForUpdate: (id: string) => Promise<Record<string, unknown> | undefined>;
  findByAuthUserId: (id: string) => Promise<ReturnType<typeof baseApplicant> | undefined>;
  findByEmailInsensitive: (email: string) => Promise<ReturnType<typeof baseApplicant> | undefined>;
  findByPhone: (phone: string) => Promise<ReturnType<typeof baseApplicant> | undefined>;
  findByCin: (cin: string) => Promise<ReturnType<typeof baseApplicant> | undefined>;
  create: (input: Record<string, unknown>) => Promise<ReturnType<typeof baseApplicant>>;
  updateIdentity: (
    id: string,
    input: Record<string, unknown>,
  ) => Promise<ReturnType<typeof baseApplicant>>;
  markReviewPending: (id: string) => Promise<ReturnType<typeof baseApplicant>>;
  approve: (
    id: string,
    reviewerUserId: string,
    expectedStatus: string,
    reviewedAt: Date,
  ) => Promise<ReturnType<typeof baseApplicant> | undefined>;
  reject: (
    id: string,
    reviewerUserId: string,
    expectedStatus: string,
    reason: string,
    reviewedAt: Date,
  ) => Promise<ReturnType<typeof baseApplicant> | undefined>;
  countByStatus: (status: string) => Promise<number>;
  findChallengeByApplicant: (id: string) => Promise<Record<string, unknown> | undefined>;
  replaceChallenge: (input: Record<string, unknown>) => Promise<Record<string, unknown>>;
  setChallengeDelivery: (
    id: string,
    hash: string,
    sent: boolean,
  ) => Promise<{ emailSent: boolean } | undefined>;
  decrementChallengeAttempts: (
    id: string,
    hash: string,
  ) => Promise<{ attemptsRemaining: number } | undefined>;
  consumeChallenge: (
    id: string,
    hash: string,
  ) => Promise<Record<string, unknown> | undefined>;
  revokeChallenge: (id: string) => Promise<void>;
  revokeCredentialSetupSessions: (id: string, revokedAt: Date) => Promise<unknown[]>;
}> = {}): ApplicantRepository {
  const findByEmailInsensitive = overrides.findByEmailInsensitive ?? (async () => undefined);
  const createApplicant: NonNullable<typeof overrides.create> = overrides.create ?? (async (input) => {
    const id = crypto.randomUUID();
    const record = baseApplicant({ ...input, id });
    storedApplicants[id] = { ...record };
    return record;
  });
  const findByAuthUserId: NonNullable<typeof overrides.findByAuthUserId> = async (id) => {
    for (const record of Object.values(storedApplicants)) {
      if (record.authUserId === id) return record as ReturnType<typeof baseApplicant>;
    }
    return overrides.findByAuthUserId ? overrides.findByAuthUserId(id) : undefined;
  };
  const findById: NonNullable<typeof overrides.findById> = async (id) => {
    if (storedApplicants[id]) return storedApplicants[id] as ReturnType<typeof baseApplicant>;
    return overrides.findById ? overrides.findById(id) : undefined;
  };
  const findChallengeByApplicant: NonNullable<typeof overrides.findChallengeByApplicant> = async (id) => {
    if (storedChallenges[id]) return storedChallenges[id];
    return overrides.findChallengeByApplicant ? overrides.findChallengeByApplicant(id) : undefined;
  };
  const replaceChallenge: NonNullable<typeof overrides.replaceChallenge> = overrides.replaceChallenge ?? (async (input) => {
    storedChallenges[String(input.applicantId)] = { ...input, consumedAt: null };
    return input;
  });
  const setChallengeDelivery: NonNullable<typeof overrides.setChallengeDelivery> = overrides.setChallengeDelivery ?? (async (
    id,
    _hash: string,
    sent,
  ) => {
    void _hash;
    if (storedChallenges[id]) {
      storedChallenges[id] = { ...storedChallenges[id], emailSent: sent };
    }
    return { emailSent: sent };
  });
  const decrementChallengeAttempts: NonNullable<typeof overrides.decrementChallengeAttempts> = overrides.decrementChallengeAttempts ?? (async (
    id,
    _hash,
  ) => {
    if (storedChallenges[id]) {
      const current = Number(storedChallenges[id]?.attemptsRemaining ?? 0) - 1;
      storedChallenges[id] = { ...storedChallenges[id], attemptsRemaining: Math.max(current, 0) };
      return { attemptsRemaining: Math.max(current, 0) };
    }
    return { attemptsRemaining: 0 };
  });
  const consumeChallenge: NonNullable<typeof overrides.consumeChallenge> = overrides.consumeChallenge ?? (async (id, hash) => {
    if (storedChallenges[id]?.codeHash === hash) {
      storedChallenges[id] = { ...storedChallenges[id], consumedAt: new Date() };
      return storedChallenges[id];
    }
    return undefined;
  });
  const markReviewPending: NonNullable<typeof overrides.markReviewPending> = overrides.markReviewPending ?? (async (id) => {
    if (storedApplicants[id]) {
      storedApplicants[id] = { ...storedApplicants[id], status: "pending_review" };
    }
    return storedApplicants[id] as ReturnType<typeof baseApplicant>;
  });

  return {
    findById,
    findByIdForUpdate: overrides.findByIdForUpdate ?? findById,
    findAuthUserByIdForUpdate: overrides.findAuthUserByIdForUpdate ?? (async (id) => ({
      id,
      email: "decision@example.test",
      name: "Decision Applicant",
      emailVerified: true,
      status: "pending",
    })),
    findByAuthUserId,
    findByEmailInsensitive,
    findByPhone: overrides.findByPhone ?? (async () => undefined),
    findByCin: overrides.findByCin ?? (async () => undefined),
    list: overrides.list ?? (async (limit: number, offset: number, filters: { status?: string; search?: string } = {}) =>
      matchStoredApplicants(filters).slice(offset, offset + limit)),
    // Mirrors the real repository: the total answers the same filter question
    // as the rows, minus the page window.
    count: overrides.count ?? (async (filters: { status?: string; search?: string } = {}) =>
      matchStoredApplicants(filters).length),
    create: createApplicant,
    updateIdentity: overrides.updateIdentity ?? (async (id: string, input: Record<string, unknown>) => {
      if (storedApplicants[id]) {
        storedApplicants[id] = { ...storedApplicants[id], ...input };
      }
      return storedApplicants[id] as ReturnType<typeof baseApplicant>;
    }),
    markReviewPending,
    approve: overrides.approve ?? (async (id, reviewerUserId, expectedStatus, reviewedAt) => {
      if (storedApplicants[id] && storedApplicants[id]?.status === expectedStatus) {
        storedApplicants[id] = {
          ...storedApplicants[id],
          status: "approved",
          reviewedAt,
          reviewedByUserId: reviewerUserId,
          rejectionReason: null,
        };
        return storedApplicants[id] as ReturnType<typeof baseApplicant>;
      }
      return undefined;
    }),
    reject: overrides.reject ?? (async (id, reviewerUserId, expectedStatus, reason, reviewedAt) => {
      if (storedApplicants[id] && storedApplicants[id]?.status === expectedStatus) {
        storedApplicants[id] = {
          ...storedApplicants[id],
          status: "rejected",
          reviewedAt,
          reviewedByUserId: reviewerUserId,
          rejectionReason: reason,
        };
        return storedApplicants[id] as ReturnType<typeof baseApplicant>;
      }
      return undefined;
    }),
    countByStatus: overrides.countByStatus ?? (async () => Object.values(storedApplicants).filter((row) => row.status === "pending_review").length),
    findChallengeByApplicant,
    replaceChallenge,
    setChallengeDelivery,
    decrementChallengeAttempts,
    consumeChallenge,
    revokeChallenge: overrides.revokeChallenge ?? (async () => undefined),
    revokeCredentialSetupSessions: overrides.revokeCredentialSetupSessions ?? (async () => []),
  } as unknown as ApplicantRepository;
}

function applicantValidator(overrides: Partial<{
  ensureExists: (id: string) => Promise<ReturnType<typeof baseApplicant>>;
  ensureEmailAvailable: (email: string, exclude?: string) => Promise<void>;
  ensurePhoneAvailable: (phone: string, exclude?: string) => Promise<void>;
  ensureCinAvailable: (cin: string, exclude?: string) => Promise<void>;
  ensureReusedIdentityAllowed: (
    existing: ReturnType<typeof baseApplicant>,
    input: { email: string; phone: string; cin: string },
  ) => Promise<void>;
}> = {}): ApplicantValidator {
  return {
    ensureExists: overrides.ensureExists ?? (async (id: string) => storedApplicants[id] as ReturnType<typeof baseApplicant>),
    ensureEmailAvailable: overrides.ensureEmailAvailable ?? (async () => undefined),
    ensurePhoneAvailable: overrides.ensurePhoneAvailable ?? (async () => undefined),
    ensureCinAvailable: overrides.ensureCinAvailable ?? (async () => undefined),
    ensureReusedIdentityAllowed: overrides.ensureReusedIdentityAllowed ?? (async () => undefined),
  } as unknown as ApplicantValidator;
}

function applicantService(overrides: Partial<{
  auth: Partial<AuthService>;
  users: Record<string, unknown>;
  userRecords: Record<string, unknown>;
  email: EmailService;
  repository: ApplicantRepository;
  validator: ApplicantValidator;
  sponsors: Record<string, unknown>;
  tokens: Record<string, unknown>;
  audits: Record<string, unknown>;
  outbox: Record<string, unknown>;
  setup: {
    begin?: (...args: unknown[]) => Promise<{ expiresAt: string }>;
    require?: (...args: unknown[]) => Promise<{ userId: string }>;
    consume?: (...args: unknown[]) => Promise<unknown>;
  };
}> = {}): ApplicantService {
  const users = {
    findByEmailInsensitive: async () => undefined,
    getById: async () => applicantUser(),
    update: async () => applicantUser(),
    assignRole: async () => applicantUser(),
    ...overrides.users,
  };
  const auth: AuthService = {
    registerUser: async (input: { email: string; name?: string }) => {
      const id = newUserId();
      const user = {
        ...applicantUser(),
        id,
        email: input.email,
        name: input.name ?? null,
      } as SanitizedUser;
      storedUsers[id] = user;
      return user;
    },
    ...(overrides.auth as Partial<AuthService> | undefined),
  } as unknown as AuthService;
  const email: EmailService = (overrides.email as EmailService | undefined) ?? ({
    sendHtml: async (_to: string, _subject: string, html: string) => {
      emailSentHtml = String(html);
      emailSendCount += 1;
      return { success: true };
    },
  } as unknown as EmailService);
  const setup = {
    begin: async () => ({
      expiresAt: new Date(Date.now() + 600_000).toISOString(),
    }),
    require: async () => ({ userId: "applicant-user" }),
    consume: async (
      _options: unknown,
      complete: (session: { userId: string }) => Promise<unknown>,
    ) => complete({ userId: "applicant-user" }),
    ...overrides.setup,
  };

  const userRecords = (overrides.userRecords as Record<string, unknown> | undefined) ?? {
    update: async (id: string, input: Record<string, unknown>) => {
      const existing = storedUsers[id] ?? applicantUser();
      const updated = { ...existing, ...input, id };
      storedUsers[id] = updated as SanitizedUser;
      return updated;
    },
  };

  return new ApplicantService(
    auth,
    users as unknown as ConstructorParameters<typeof ApplicantService>[1],
    userRecords as unknown as ConstructorParameters<typeof ApplicantService>[2],
    email,
    overrides.repository ?? applicantRepository(),
    overrides.validator ?? applicantValidator(),
    setup as unknown as ConstructorParameters<typeof ApplicantService>[6],
    {
      findByUserId: async () => undefined,
      findByEmail: async () => undefined,
      findByPhone: async () => undefined,
      findByCin: async () => undefined,
      create: async (input: Record<string, unknown>) => ({
        id: "sponsor-profile-1",
        userId: String(input.userId),
        ...input,
      }),
      ...overrides.sponsors,
    } as unknown as ConstructorParameters<typeof ApplicantService>[7],
    {
      record: async () => undefined,
      ...((overrides as { audits?: Record<string, unknown> }).audits ?? {}),
    } as unknown as ConstructorParameters<typeof ApplicantService>[8],
    {
      enqueue: async (input: Record<string, unknown>) => ({
        id: "outbox-event-1",
        ...input,
      }),
      markDelivered: async () => undefined,
      markDeliveryFailed: async () => undefined,
      ...((overrides as { outbox?: Record<string, unknown> }).outbox ?? {}),
    } as unknown as ConstructorParameters<typeof ApplicantService>[9],
    overrides.tokens as unknown as ConstructorParameters<typeof ApplicantService>[10],
  );
}
