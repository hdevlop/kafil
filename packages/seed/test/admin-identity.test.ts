import { describe, expect, it } from "bun:test";

import { reconcileAdminIdentity } from "../src/admin-identity";

function createOperations(ownerId?: string) {
  const updates: Array<{ email: string; id: string }> = [];
  const revoked: string[] = [];
  let ownerChecks = 0;

  return {
    findDesiredEmailOwner: async () => {
      ownerChecks += 1;
      return ownerId ? { id: ownerId } : undefined;
    },
    get ownerChecks() {
      return ownerChecks;
    },
    revokeActiveTokens: async (adminId: string) => {
      revoked.push(adminId);
    },
    revoked,
    updateEmail: async (id: string, email: string) => {
      updates.push({ email, id });
    },
    updates,
  };
}

describe("bootstrap admin identity reconciliation", () => {
  it("does not mutate when no bootstrap admin exists", async () => {
    const operations = createOperations();

    expect(
      await reconcileAdminIdentity({
        desiredEmail: "new@example.test",
        existingAdmins: [],
        ...operations,
      }),
    ).toBe(false);
    expect(operations.ownerChecks).toBe(1);
    expect(operations.updates).toEqual([]);
    expect(operations.revoked).toEqual([]);
  });

  it("rejects an existing non-admin owner when no bootstrap admin exists", async () => {
    const operations = createOperations("other-user-id");

    await expect(
      reconcileAdminIdentity({
        desiredEmail: "taken@example.test",
        existingAdmins: [],
        ...operations,
      }),
    ).rejects.toThrow("already belongs to another user");
    expect(operations.updates).toEqual([]);
    expect(operations.revoked).toEqual([]);
  });

  it("does not mutate when the bootstrap admin email already matches", async () => {
    const operations = createOperations();

    expect(
      await reconcileAdminIdentity({
        desiredEmail: " Admin@Example.Test ",
        existingAdmins: [
          { email: "admin@example.test", id: "admin-user-id" },
        ],
        ...operations,
      }),
    ).toBe(false);
    expect(operations.ownerChecks).toBe(0);
    expect(operations.updates).toEqual([]);
    expect(operations.revoked).toEqual([]);
  });

  it("updates the same admin ID and revokes active sessions", async () => {
    const operations = createOperations();

    expect(
      await reconcileAdminIdentity({
        desiredEmail: "new@example.test",
        existingAdmins: [
          { email: "old@example.test", id: "admin-user-id" },
        ],
        ...operations,
      }),
    ).toBe(true);
    expect(operations.updates).toEqual([
      { email: "new@example.test", id: "admin-user-id" },
    ]);
    expect(operations.revoked).toEqual(["admin-user-id"]);
  });

  it("rejects an email owned by another user before mutation", async () => {
    const operations = createOperations("other-user-id");

    await expect(
      reconcileAdminIdentity({
        desiredEmail: "taken@example.test",
        existingAdmins: [
          { email: "old@example.test", id: "admin-user-id" },
        ],
        ...operations,
      }),
    ).rejects.toThrow("already belongs to another user");
    expect(operations.updates).toEqual([]);
    expect(operations.revoked).toEqual([]);
  });

  it("fails closed when multiple bootstrap admins exist", async () => {
    const operations = createOperations();

    await expect(
      reconcileAdminIdentity({
        desiredEmail: "new@example.test",
        existingAdmins: [
          { email: "first@example.test", id: "first-admin-id" },
          { email: "second@example.test", id: "second-admin-id" },
        ],
        ...operations,
      }),
    ).rejects.toThrow("at most one bootstrap admin");
    expect(operations.ownerChecks).toBe(0);
    expect(operations.updates).toEqual([]);
    expect(operations.revoked).toEqual([]);
  });

  it("validates the desired email before invoking any operation", async () => {
    const operations = createOperations();

    await expect(
      reconcileAdminIdentity({
        desiredEmail: "not-an-email",
        existingAdmins: [
          { email: "old@example.test", id: "admin-user-id" },
        ],
        ...operations,
      }),
    ).rejects.toThrow("valid email address");
    expect(operations.ownerChecks).toBe(0);
    expect(operations.updates).toEqual([]);
    expect(operations.revoked).toEqual([]);
  });
});
