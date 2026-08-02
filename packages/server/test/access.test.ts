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
import { EmailService } from "najm-email";
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
  sponsorAccessRegistrationDto,
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

  it("keeps public sponsor registration pinned to safe fields", () => {
    const parsed = sponsorAccessRegistrationDto.parse({
      name: "Public Sponsor",
      email: "public@example.test",
      password: "StrongPass1",
      locale: "fr",
      role: "admin",
      status: "active",
      emailVerified: true,
    });

    expect(parsed).toEqual({
      name: "Public Sponsor",
      email: "public@example.test",
      password: "StrongPass1",
      locale: "fr",
    });
  });

  it("allows a simple lowercase family replacement password only", () => {
    expect(familyFirstPasswordDto.safeParse({ newPassword: "fatima2026" }).success).toBe(true);
    expect(familyFirstPasswordDto.safeParse({ newPassword: "Fatima2026" }).success).toBe(false);
    expect(familyFirstPasswordDto.safeParse({ newPassword: "12345678" }).success).toBe(false);
    expect(familyFirstPasswordDto.safeParse({ newPassword: "ab123456" }).success).toBe(false);
  });
});

describe("Kafil access service", () => {
  it("buckets login by normalized identity and OTP commands by IP", () => {
    expect(getRateLimitOptions(AccessController, "login")?.key).toBe(authIdentityRateLimitKey);
    expect(getRateLimitOptions(AccessController, "login")?.limit).toBe(5);
    expect(getRateLimitOptions(AccessController, "resendVerification")?.key).toBe("ip");
    expect(getRateLimitOptions(AccessController, "confirmVerification")?.key).toBe("ip");
  });

  it("keeps production-safe access rate defaults and overrides", () => {
    expect(resolveAccessRateLimitConfig({})).toEqual({
      login: { limit: 5, window: "15m" },
      sponsorRegistration: { limit: 5, window: "15m" },
      verificationResend: { limit: 3, window: "15m" },
      verificationConfirm: { limit: 5, window: "15m" },
      familyPasswordChange: { limit: 5, window: "15m" },
    });
    expect(resolveAccessRateLimitConfig({
      KAFIL_ACCESS_RATE_LIMIT: "100",
      KAFIL_ACCESS_RATE_WINDOW: "1h",
      KAFIL_ACCESS_VERIFICATION_REQUEST_RATE_LIMIT: "20",
    }).verificationResend).toEqual({ limit: 20, window: "1h" });
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

  it("valid pending sponsor credentials create only the scoped OTP next step", async () => {
    const calls: unknown[][] = [];
    const service = accessService({
      users: {
        findByEmailInsensitive: async () => pendingSponsor,
      },
      auth: {
        verifyPendingCredentials: async (credentials: unknown, role: string) => {
          calls.push(["verify", credentials, role]);
          return pendingSponsor;
        },
        verifyCredentials: async () => {
          throw new Error("ordinary active verification must not run");
        },
      },
      setup: {
        begin: async (userId: string, options: unknown) => {
          calls.push(["begin", userId, options]);
          return { expiresAt: "2030-01-01T00:00:00.000Z" };
        },
      },
    });

    const result = await service.login({
      identifier: "Sponsor@Example.Test",
      password: "StrongPass1",
      rememberMe: true,
      locale: "ar",
    });
    expect(result).toMatchObject({
      nextStep: "sponsor_email_otp",
      maskedDestination: "s***@e***.test",
      emailSent: true,
    });
    expect(JSON.stringify(result)).not.toContain("123456");
    expect(calls[0]).toEqual([
      "verify",
      { identifier: "sponsor@example.test", password: "StrongPass1" },
      "sponsor",
    ]);
  });

  it("registration stores only a keyed hash and repeated pending registration rotates it", async () => {
    const stored: Record<string, unknown>[] = [];
    const messages: unknown[][] = [];
    const service = accessService({
      users: { findByEmailInsensitive: async () => pendingSponsor },
      auth: { registerUser: async () => { throw new Error("must not duplicate"); } },
      access: {
        replaceSponsorEmailOtpChallenge: async (input: Record<string, unknown>) => {
          stored.push(input);
          return input;
        },
      },
      email: {
        sendHtml: async (...input: unknown[]) => {
          messages.push(input);
          return { success: true };
        },
      },
    });

    await service.registerSponsor({
      name: "Ignored",
      email: "SPONSOR@example.test",
      password: "StrongPass1",
      locale: "fr",
    });
    await service.registerSponsor({
      name: "Ignored",
      email: "SPONSOR@example.test",
      password: "StrongPass1",
      locale: "fr",
    });

    expect(stored).toHaveLength(2);
    expect(stored[0]?.codeHash).toMatch(/^[a-f0-9]{64}$/);
    expect(stored[1]?.codeHash).toMatch(/^[a-f0-9]{64}$/);
    expect(stored[1]?.codeHash).not.toBe(stored[0]?.codeHash);
    expect(JSON.stringify(stored)).not.toMatch(/"code"\s*:/);
    expect(String(messages[0]?.[2])).not.toContain("verify-email?token=");
    expect(String(messages[0]?.[2])).toMatch(/\d{6}/);
  });

  it("never reuses an active sponsor through registration", async () => {
    let sent = false;
    const service = accessService({
      users: {
        findByEmailInsensitive: async () => ({ ...pendingSponsor, status: "active", emailVerified: true }),
      },
      auth: { registerUser: async () => { throw new Error("email already exists"); } },
      email: { sendHtml: async () => { sent = true; return { success: true }; } },
    });
    await expect(service.registerSponsor({
      email: pendingSponsor.email,
      password: "StrongPass1",
    })).rejects.toThrow("email already exists");
    expect(sent).toBe(false);
  });

  it("wrong OTP decrements attempts without consuming the setup session", async () => {
    let attempts = 5;
    let consumed = false;
    const service = accessService({
      setup: {
        require: async () => ({ userId: pendingSponsor.id }),
        consume: async () => { consumed = true; },
      },
      access: {
        findSponsorEmailOtpChallenge: async () => ({
          userId: pendingSponsor.id,
          codeHash: "0".repeat(64),
          expiresAt: new Date(Date.now() + 60_000),
          attemptsRemaining: attempts,
          consumedAt: null,
        }),
        decrementSponsorEmailOtpAttempts: async () => ({ attemptsRemaining: --attempts }),
      },
    });
    await expect(service.confirmVerification("123456")).rejects.toBeDefined();
    expect(attempts).toBe(4);
    expect(consumed).toBe(false);
  });

  it("correct OTP atomically consumes challenge, activates sponsor, and remembers preference", async () => {
    const events: unknown[][] = [];
    let storedHash = "";
    const service = accessService({
      users: {
        findByEmailInsensitive: async () => pendingSponsor,
        getById: async () => pendingSponsor,
        update: async (...input: unknown[]) => { events.push(["update", ...input]); },
      },
      auth: {
        establishSession: async (user: Record<string, unknown>) => ({
          accessToken: "access",
          refreshToken: "refresh",
          user,
        }),
      },
      setup: {
        require: async () => ({ userId: pendingSponsor.id }),
        consume: async (_options: unknown, complete: (value: { userId: string }) => Promise<unknown>) => {
          events.push(["consume-setup"]);
          return complete({ userId: pendingSponsor.id });
        },
      },
      access: {
        replaceSponsorEmailOtpChallenge: async (input: Record<string, unknown>) => {
          storedHash = String(input.codeHash);
          return input;
        },
        findSponsorEmailOtpChallenge: async () => ({
          userId: pendingSponsor.id,
          codeHash: storedHash,
          expiresAt: new Date(Date.now() + 60_000),
          attemptsRemaining: 5,
          rememberMe: true,
          consumedAt: null,
        }),
        consumeSponsorEmailOtpChallenge: async (_userId: string, hash: string) => ({
          rememberMe: true,
          codeHash: hash,
        }),
      },
    });
    // Capture a valid hash by issuing a challenge; the six-digit code stays only in the email body.
    let deliveredCode = "";
    (service as unknown as { email: { sendHtml: (...args: unknown[]) => Promise<{ success: boolean }> } }).email = {
      sendHtml: async (_to, _subject, html) => {
        deliveredCode = String(html).match(/\d{6}/)?.[0] ?? "";
        return { success: true };
      },
    };
    await service.registerSponsor({ email: pendingSponsor.email, password: "StrongPass1" });
    const result = await service.confirmVerification(deliveredCode);
    expect(result).toMatchObject({
      nextStep: "authenticated",
      rememberMe: true,
      accessToken: "access",
    });
    expect(events).toContainEqual([
      "update",
      pendingSponsor.id,
      { emailVerified: true, status: "active" },
    ]);
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

const pendingSponsor = {
  id: "sponsor-user",
  email: "sponsor@example.test",
  name: "Public Sponsor",
  role: "sponsor",
  status: "pending",
  emailVerified: false,
};

function accessService(overrides: {
  auth?: Record<string, unknown>;
  users?: Record<string, unknown>;
  email?: Record<string, unknown>;
  access?: Record<string, unknown>;
  familyPasswords?: Record<string, unknown>;
  setup?: Record<string, unknown>;
}) {
  const users = {
    findByEmailInsensitive: async () => undefined,
    findByPhone: async () => undefined,
    getById: async () => pendingSponsor,
    ...overrides.users,
  };
  const access = {
    requiresFamilyPasswordChange: async () => false,
    replaceSponsorEmailOtpChallenge: async (input: Record<string, unknown>) => input,
    setSponsorEmailOtpDelivery: async () => ({ emailSent: true }),
    ...overrides.access,
  };
  const email = {
    sendHtml: async () => ({ success: true }),
    ...overrides.email,
  };
  const setup = {
    begin: async () => ({ expiresAt: new Date(Date.now() + 60_000).toISOString() }),
    ...overrides.setup,
  };
  return new AccessService(
    (overrides.auth ?? {}) as unknown as AuthService,
    users as unknown as UserService,
    email as unknown as EmailService,
    access as unknown as AccessRepository,
    (overrides.familyPasswords ?? {}) as unknown as FamilyPasswordService,
    setup as unknown as CredentialSetupService,
  );
}
