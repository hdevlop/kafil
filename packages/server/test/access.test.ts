import { describe, expect, it } from "bun:test";
import {
  AuthService,
  authIdentityRateLimitKey,
  CookieManager,
  EncryptionService,
  TokenService,
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
  normalizePhone,
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

  it("creates a simple surname and birth-year password for families", () => {
    expect(generateFamilyInitialPassword("Amina El Amrani", "1987-03-12")).toBe(
      "Amrani1987",
    );
    expect(generateFamilyInitialPassword("أمينة", "1987-03-12")).toBe(
      "Kafil1987",
    );
  });

  it("keeps public sponsor registration pinned to Najm's account fields", () => {
    const parsed = sponsorAccessRegistrationDto.parse({
      name: "Public Sponsor",
      email: "public@example.test",
      password: "StrongPass1",
      role: "admin",
      status: "active",
      emailVerified: true,
    });

    expect(parsed).toEqual({
      name: "Public Sponsor",
      email: "public@example.test",
      password: "StrongPass1",
    });
  });

  it("allows a simple lowercase family replacement password only", () => {
    expect(
      familyFirstPasswordDto.safeParse({
        currentPassword: "Amrani1987",
        newPassword: "fatima2026",
      }).success,
    ).toBe(true);
    expect(
      familyFirstPasswordDto.safeParse({
        currentPassword: "Amrani1987",
        newPassword: "Fatima2026",
      }).success,
    ).toBe(false);
    expect(
      familyFirstPasswordDto.safeParse({
        currentPassword: "Amrani1987",
        newPassword: "12345678",
      }).success,
    ).toBe(false);
  });
});

describe("Kafil access service", () => {
  it("buckets login attempts by Najm's normalized identity key", () => {
    const options = getRateLimitOptions(AccessController, "login");

    expect(options?.limit).toBe(5);
    expect(options?.window).toBe("15m");
    expect(options?.key).toBe(authIdentityRateLimitKey);
  });

  it("normalizes a phone identifier before delegating login to Najm", async () => {
    const logins: Record<string, unknown>[] = [];
    const service = accessService({
      auth: {
        loginUser: async (input: Record<string, unknown>) => {
          logins.push(input);
          return {
            accessToken: "access",
            refreshToken: "refresh",
            user: { id: "family-user", role: "family" },
          };
        },
      },
      access: {
        requiresFamilyPasswordChange: async (userId: string) => {
          expect(userId).toBe("family-user");
          return true;
        },
      },
    });

    const result = await service.login({
      identifier: "06 12 34 56 78",
      password: "Secret1",
    });
    expect(result.mustChangePassword).toBe(true);
    expect(logins).toEqual([
      { identifier: "+212612345678", password: "Secret1" },
    ]);
  });

  it("creates a pending sponsor token and sends the Najm verification template", async () => {
    const stored: Record<string, unknown>[] = [];
    const messages: unknown[][] = [];
    const service = accessService({
      auth: {
        registerUser: async () => ({
          id: "sponsor-user",
          email: "public@example.test",
          name: "Public Sponsor",
          status: "pending",
          emailVerified: false,
        }),
      },
      access: {
        replaceVerificationToken: async (input: Record<string, unknown>) => {
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

    await expect(
      service.registerSponsor({
        name: "Public Sponsor",
        email: "public@example.test",
        password: "StrongPass1",
      }),
    ).resolves.toEqual({ emailSent: true });
    expect(stored).toHaveLength(1);
    expect(stored[0]?.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(messages[0]?.[0]).toBe("public@example.test");
    expect(String(messages[0]?.[2])).toContain("/verify-email?token=");
  });

  it("activates only a valid, unconsumed verification token", async () => {
    const updates: unknown[][] = [];
    const service = accessService({
      users: {
        update: async (...input: unknown[]) => {
          updates.push(input);
          return {};
        },
      },
      access: {
        consumeVerificationToken: async (hash: string) => {
          expect(hash).toMatch(/^[a-f0-9]{64}$/);
          return { userId: "sponsor-user" };
        },
      },
    });

    await expect(service.confirmVerification("v".repeat(40))).resolves.toEqual({
      verified: true,
    });
    expect(updates).toEqual([
      ["sponsor-user", { emailVerified: true, status: "active" }],
    ]);
  });
});

describe("family first-login password change", () => {
  it("replaces the temporary hash, clears the requirement, and revokes sessions", async () => {
    const events: unknown[][] = [];
    const service = new FamilyPasswordService(
      {
        getAuthRecordById: async () => ({ password: "old-hash" }),
      } as unknown as UserService,
      {
        update: async (...input: unknown[]) => {
          events.push(["update", ...input]);
          return {};
        },
      } as unknown as UserRepository,
      {
        comparePassword: async (password: string) =>
          password === "Amrani1987",
      } as unknown as UserValidator,
      {
        hashPassword: async (password: string) => `hash:${password}`,
      } as unknown as EncryptionService,
      {
        invalidateUserAccessTokens: async (userId: string) => {
          events.push(["invalidate", userId]);
          return 1;
        },
        revokeAllForUser: async (userId: string) => {
          events.push(["revoke", userId]);
          return {};
        },
      } as unknown as TokenService,
      {
        clearRefreshToken: () => events.push(["clear-refresh"]),
        clearSessionCookie: () => events.push(["clear-session"]),
      } as unknown as CookieManager,
      {
        requiresFamilyPasswordChange: async () => true,
        completeFamilyPasswordChange: async (userId: string) => {
          events.push(["complete", userId]);
          return { userId, required: false };
        },
      } as unknown as AccessRepository,
    );

    await expect(
      service.change("family-user", {
        currentPassword: "Amrani1987",
        newPassword: "fatima2026",
      }),
    ).resolves.toEqual({ changed: true, signInAgain: true });

    expect(events).toEqual([
      ["update", "family-user", { password: "hash:fatima2026" }],
      ["complete", "family-user"],
      ["invalidate", "family-user"],
      ["revoke", "family-user"],
      ["clear-refresh"],
      ["clear-session"],
    ]);
  });
});

function accessService(overrides: {
  auth?: Record<string, unknown>;
  users?: Record<string, unknown>;
  email?: Record<string, unknown>;
  access?: Record<string, unknown>;
}) {
  return new AccessService(
    (overrides.auth ?? {}) as unknown as AuthService,
    (overrides.users ?? {}) as unknown as UserService,
    (overrides.email ?? {}) as unknown as EmailService,
    (overrides.access ?? {}) as unknown as AccessRepository,
  );
}
