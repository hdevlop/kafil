import { describe, expect, it } from "bun:test";
import { AuthService, TokenService, type CookieManager, type TokenRepository } from "najm-auth";
import { CacheService } from "najm-cache";

describe("installed Najm Auth invitation activation contract", () => {
  it("verifies and activates a pending account when its invitation sets a password", async () => {
    const updates: Array<{ id: string; data: Record<string, unknown> }> = [];
    const invalidated: string[] = [];
    const revoked: string[] = [];
    const cleared: string[] = [];
    const auth = Object.create(AuthService.prototype) as AuthService;
    const credential = { id: "pending-user", email: "pending@example.invalid",
      password: "stored-test-hash", status: "pending" as const, emailVerified: false };
    const config = { jwt: { refreshSecret: "invitation-test-secret-at-least-32-characters" } };
    const cache = new CacheService({ driver: "memory", required: false, memory: {} });
    const tokens = new TokenService({ getCredentialState: async () => credential } as unknown as TokenRepository,
      {} as CookieManager, cache);
    Object.assign(tokens, { config, t: (key: string) => key });
    const invitation = await tokens.generateInviteToken(credential.id, credential.email);

    Object.assign(auth as unknown as Record<string, unknown>, {
      cookieManager: {
        clearRefreshToken: () => cleared.push("refresh"),
        clearSessionCookie: () => cleared.push("session"),
      },
      t: (key: string) => key,
      config,
      tokenService: {
        consumeSetPasswordToken: tokens.consumeSetPasswordToken.bind(tokens),
        invalidateUserAccessTokens: async (id: string) => invalidated.push(id),
        revokeAllForUser: async (id: string) => revoked.push(id),
      },
      userService: {
        getAuthRecordById: async () => credential,
        update: async (id: string, data: Record<string, unknown>) => {
          updates.push({ id, data });
          return { id, ...data };
        },
      },
      userValidator: {
        validatePasswordStrength: () => undefined,
      },
    });

    try {
      await auth.resetPassword(invitation.token, "SafePassword2026");
      await expect(auth.resetPassword(invitation.token, "SafePassword2026")).rejects.toThrow();
    } finally {
      await cache.destroy();
    }

    expect(updates).toEqual([
      {
        id: "pending-user",
        data: {
          emailVerified: true,
          password: "SafePassword2026",
          status: "active",
        },
      },
    ]);
    expect(invalidated).toEqual(["pending-user"]);
    expect(revoked).toEqual(["pending-user"]);
    expect(cleared).toEqual(["refresh", "session"]);
  });
});
