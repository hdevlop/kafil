import { describe, expect, it } from "bun:test";
import {
  AuthService,
  authIdentityRateLimitKey,
  CredentialSetupService,
  EncryptionService,
  UserRepository,
  UserService,
  UserValidator,
} from "najm-auth";
import { getRateLimitOptions } from "najm-rate";

import {
  AccessController,
  AccessRepository,
  AccessService,
  FamilyPasswordService,
  familyFirstPasswordDto,
  generateFamilyInitialPassword,
  generateInitialPassword,
  normalizeFamilyCinCredential,
  normalizePhone,
  resolveAccessRateLimitConfig,
} from "../src/modules/access";

describe("accessible account credentials", () => {
  it("normalizes Moroccan local numbers and preserves international numbers", () => {
    expect(normalizePhone("06 12-34-56-78")).toBe("+212612345678");
    expect(normalizePhone("212612345678")).toBe("+212612345678");
    expect(normalizePhone("+33 6 12 34 56 78")).toBe("+33612345678");
    expect(normalizePhone("not-a-phone")).toBeNull();
  });

  it("adds unpredictable digits to the surname and birth-year password", () => {
    expect(generateInitialPassword("Amina El Amrani", "1987-03-12", 4721)).toBe(
      "Amrani1987!4721",
    );
    expect(generateInitialPassword("أمينة", "1987-03-12", 4721)).toBe(
      "Kafil1987!4721",
    );
  });

  it("uses a lowercase guardian CIN as the family initial password", () => {
    expect(generateFamilyInitialPassword("AB123456")).toBe("ab123456");
    expect(generateFamilyInitialPassword("ab123456")).toBe("ab123456");
  });

  it("normalizes only CIN-shaped credentials", () => {
    expect(normalizeFamilyCinCredential(" AB123456 ")).toBe("ab123456");
    expect(normalizeFamilyCinCredential("StrongPass1")).toBe("StrongPass1");
  });

  it("allows a simple lowercase family replacement password only", () => {
    expect(familyFirstPasswordDto.safeParse({ newPassword: "fatima2026" }).success).toBe(true);
    expect(familyFirstPasswordDto.safeParse({ newPassword: "Fatima2026" }).success).toBe(false);
    expect(familyFirstPasswordDto.safeParse({ newPassword: "12345678" }).success).toBe(false);
    expect(familyFirstPasswordDto.safeParse({ newPassword: "ab123456" }).success).toBe(false);
  });
});

describe("Kafil access service", () => {
  it("buckets login by normalized identity only", () => {
    expect(getRateLimitOptions(AccessController, "login")?.key).toBe(authIdentityRateLimitKey);
    expect(getRateLimitOptions(AccessController, "login")?.limit).toBe(5);
  });

  it("keeps production-safe access rate defaults and overrides", () => {
    expect(resolveAccessRateLimitConfig({})).toEqual({
      login: { limit: 5, window: "15m" },
      familyPasswordChange: { limit: 5, window: "15m" },
    });
    expect(resolveAccessRateLimitConfig({
      KAFIL_ACCESS_RATE_LIMIT: "100",
      KAFIL_ACCESS_RATE_WINDOW: "1h",
    }).login).toEqual({ limit: 100, window: "1h" });
    expect(() => resolveAccessRateLimitConfig({ KAFIL_ACCESS_RATE_LIMIT: "0" })).toThrow();
  });

  it("routes family setup and normal login through explicit next steps", async () => {
    const family = accessService({
      auth: { verifyCredentials: async () => ({ id: "family-user", role: "family" }) },
      access: { requiresFamilyPasswordChange: async () => true },
      familyPasswords: {
        begin: async () => ({ setupRequired: true, expiresAt: "soon" }),
      },
    });
    await expect(family.login({
      identifier: "+212612345678",
      password: "AB123456",
    })).resolves.toEqual({
      nextStep: "family_password_setup",
      setupRequired: true,
      expiresAt: "soon",
    });

    const active = accessService({
      auth: {
        verifyCredentials: async () => ({ id: "operator-user", role: "operator" }),
        establishSession: async (user: Record<string, unknown>) => ({
          accessToken: "access",
          refreshToken: "refresh",
          user,
        }),
      },
    });
    const result = await active.login({
      identifier: "operator@example.test",
      password: "Password1",
    });
    expect(result).toMatchObject({ nextStep: "authenticated", accessToken: "access" });
  });

  it("lets an approved sponsor sign in through the email they used to apply", async () => {
    const sessionEvents: unknown[] = [];
    const service = accessService({
      auth: {
        verifyCredentials: async () => ({
          id: "sponsor-user",
          email: "approved@example.test",
          role: "sponsor",
          status: "active",
          emailVerified: true,
        }),
        establishSession: async (user: Record<string, unknown>) => {
          sessionEvents.push(user);
          return {
            accessToken: "approved-access",
            refreshToken: "approved-refresh",
            user,
          };
        },
      },
    });

    const result = await service.login({
      identifier: "approved@example.test",
      password: "StrongPass1",
    });
    expect(result).toMatchObject({
      nextStep: "authenticated",
      accessToken: "approved-access",
    });
    expect(sessionEvents).toHaveLength(1);
  });

  it("resolves the same approved sponsor through the normalized phone", async () => {
    const resolvedIdentifiers: string[] = [];
    const service = accessService({
      auth: {
        verifyCredentials: async (creds: { identifier: string }) => {
          resolvedIdentifiers.push(creds.identifier);
          return {
            id: "sponsor-user",
            email: "approved@example.test",
            role: "sponsor",
            status: "active",
            emailVerified: true,
          };
        },
        establishSession: async (user: Record<string, unknown>) => ({
          accessToken: "approved-access",
          refreshToken: "approved-refresh",
          user,
        }),
      },
    });

    const result = await service.login({
      identifier: "06 12 34 56 78",
      password: "StrongPass1",
    });
    expect(result).toMatchObject({ nextStep: "authenticated" });
    expect(resolvedIdentifiers[0]).toBe("+212612345678");
  });

  it("never mints tokens for a still-pending applicant", async () => {
    const pendingCalls: unknown[] = [];
    const service = accessService({
      auth: {
        verifyCredentials: async (creds: { identifier: string }) => {
          pendingCalls.push(creds.identifier);
          throw new Error(
            "Najm should block pending applicants before reaching AccessService",
          );
        },
        establishSession: async () => {
          throw new Error("establishSession must not run for pending applicants");
        },
      },
    });

    await expect(
      service.login({
        identifier: "pending@example.test",
        password: "StrongPass1",
      }),
    ).rejects.toThrow(/Najm should block/);
    expect(pendingCalls).toHaveLength(1);
  });

  it("never mints tokens for a rejected or inactive identity", async () => {
    const blocked = accessService({
      auth: {
        verifyCredentials: async () => {
          throw new Error(
            "Najm should block rejected or inactive identities before AccessService",
          );
        },
        establishSession: async () => {
          throw new Error("establishSession must not run for rejected identities");
        },
      },
    });

    await expect(
      blocked.login({
        identifier: "rejected@example.test",
        password: "StrongPass1",
      }),
    ).rejects.toThrow(/Najm should block/);
  });
});

describe("family first-login password change", () => {
  it("delegates the short-lived setup-only session to Najm Auth", async () => {
    const events: unknown[][] = [];
    const service = new FamilyPasswordService(
      {} as UserService,
      {} as UserRepository,
      {} as UserValidator,
      {} as EncryptionService,
      {
        begin: async (userId: string, options: unknown) => {
          events.push(["begin", userId, options]);
          return { purpose: "family-password", expiresAt: new Date(Date.now() + 60_000).toISOString() };
        },
      } as unknown as CredentialSetupService,
      {} as AccessRepository,
    );
    const result = await service.begin("family-user");
    expect(result.setupRequired).toBe(true);
    expect(events[0]?.[0]).toBe("begin");
  });

  it("consumes setup around the password transaction", async () => {
    const events: unknown[][] = [];
    const service = new FamilyPasswordService(
      { getAuthRecordById: async () => ({ password: "old-hash" }) } as unknown as UserService,
      { update: async (...input: unknown[]) => { events.push(["update", ...input]); } } as unknown as UserRepository,
      { comparePassword: async () => false } as unknown as UserValidator,
      { hashPassword: async (password: string) => `hash:${password}` } as unknown as EncryptionService,
      {
        consume: async (_options: unknown, complete: (session: { userId: string }) => Promise<unknown>) => complete({ userId: "family-user" }),
      } as unknown as CredentialSetupService,
      {
        requiresFamilyPasswordChange: async () => true,
        completeFamilyPasswordChange: async () => ({ required: false }),
      } as unknown as AccessRepository,
    );
    await expect(service.change({ newPassword: "fatima2026" })).resolves.toEqual({ changed: true, signInAgain: true });
    expect(events).toContainEqual(["update", "family-user", { password: "hash:fatima2026" }]);
  });
});

function accessService(overrides: {
  auth?: Record<string, unknown>;
  access?: Record<string, unknown>;
  familyPasswords?: Record<string, unknown>;
}) {
  const access = {
    requiresFamilyPasswordChange: async () => false,
    ...overrides.access,
  };
  return new AccessService(
    (overrides.auth ?? {}) as unknown as AuthService,
    access as unknown as AccessRepository,
    (overrides.familyPasswords ?? {}) as unknown as FamilyPasswordService,
  );
}
