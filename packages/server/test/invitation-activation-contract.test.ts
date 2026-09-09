import { describe, expect, it } from "bun:test";
import { AuthService } from "najm-auth";

describe("installed Najm Auth invitation activation contract", () => {
  it("verifies and activates a pending account when its invitation sets a password", async () => {
    const updates: Array<{ id: string; data: Record<string, unknown> }> = [];
    const invalidated: string[] = [];
    const revoked: string[] = [];
    const cleared: string[] = [];
    const auth = Object.create(AuthService.prototype) as AuthService;

    Object.assign(auth as unknown as Record<string, unknown>, {
      cookieManager: {
        clearRefreshToken: () => cleared.push("refresh"),
        clearSessionCookie: () => cleared.push("session"),
      },
      t: (key: string) => key,
      tokenService: {
        consumeSetPasswordToken: async () => ({
          type: "invite" as const,
          userId: "pending-user",
        }),
        invalidateUserAccessTokens: async (id: string) => invalidated.push(id),
        revokeAllForUser: async (id: string) => revoked.push(id),
      },
      userService: {
        getById: async () => ({ id: "pending-user", status: "pending" }),
        update: async (id: string, data: Record<string, unknown>) => {
          updates.push({ id, data });
          return { id, ...data };
        },
      },
      userValidator: {
        validatePasswordStrength: () => undefined,
      },
    });

    await auth.resetPassword("one-time-invitation", "SafePassword2026");

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
