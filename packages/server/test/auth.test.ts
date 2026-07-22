import { describe, expect, it } from "bun:test";

import {
  Document,
  Operator,
  Sponsor,
} from "../src/modules";
import {
  authConfig,
  hasRole,
  isInGroup,
  KafilRoleGuard,
  ROLES,
} from "../src/config/authConfig";

describe("Kafil auth definitions", () => {
  it("defines the four product roles with admin as the super role", () => {
    expect(ROLES).toEqual({
      ADMIN: "admin",
      OPERATOR: "operator",
      FAMILY: "family",
      SPONSOR: "sponsor",
    });
    expect(hasRole("admin", "OPERATOR")).toBe(true);
    expect(hasRole("admin", "FAMILY")).toBe(true);
    expect(hasRole("admin", "SPONSOR")).toBe(true);
    expect(hasRole("operator", "OPERATOR")).toBe(true);
    expect(hasRole("family", "FAMILY")).toBe(true);
    expect(hasRole("sponsor", "OPERATOR")).toBe(false);
    expect(isInGroup("family", ["ADMIN", "OPERATOR", "FAMILY"])).toBe(
      true,
    );
  });

  it("assigns public registration to the sponsor workflow", () => {
    expect(authConfig().config).toMatchObject({ defaultRole: "sponsor" });
  });

  it("authorizes the canonical role from an already resolved user", async () => {
    const guard = new KafilRoleGuard({} as never);

    expect(
      await guard.canActivate(
        { allowedRoles: ["operator", "admin"] },
        { id: "operator-1", role: "operator", permissions: ["families:list"] },
      ),
    ).toEqual({
      user: {
        id: "operator-1",
        role: "operator",
        permissions: ["families:list"],
      },
      role: "operator",
      permissions: ["families:list"],
    });
    expect(
      await guard.canActivate(
        { allowedRoles: ["family", "admin"] },
        { id: "operator-1", role: "operator" },
      ),
    ).toBe(false);
  });

  it("validates a bearer token when auth context is not populated", async () => {
    const guard = new KafilRoleGuard({
      getUser: async () => ({
        id: "sponsor-1",
        role: "sponsor",
        permissions: ["contributions:create"],
      }),
    } as never);

    expect(
      await guard.canActivate(
        { allowedRoles: ["sponsor", "admin"] },
        undefined,
        { req: { header: () => "Bearer signed-token" } },
      ),
    ).toMatchObject({ role: "sponsor" });
  });

  it("re-resolves a bearer token when middleware publishes partial claims", async () => {
    const guard = new KafilRoleGuard({
      getUser: async () => ({ id: "operator-1", role: "operator" }),
    } as never);

    expect(
      await guard.canActivate(
        { allowedRoles: ["operator", "admin"] },
        { id: "operator-1" },
        { req: { header: () => "Bearer signed-token" } },
      ),
    ).toMatchObject({ role: "operator" });
  });

  it("uses API resource names for policy permission resolution", () => {
    expect(Operator.name).toBe("operators");
    expect(Sponsor.name).toBe("sponsors");
    expect(Document.name).toBe("documents");
  });
});
