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

  it("authorizes the roles array published in Najm access tokens", () => {
    const guard = new KafilRoleGuard();

    expect(
      guard.canActivate({ allowedRoles: ["operator"] }, ["operator"]),
    ).toBe(true);
    expect(
      guard.canActivate({ allowedRoles: ["operator", "admin"] }, ["admin"]),
    ).toBe(true);
    expect(guard.canActivate({ allowedRoles: ["family"] }, ["sponsor"])).toBe(
      false,
    );
    expect(guard.canActivate({ allowedRoles: ["sponsor"] }, undefined)).toBe(
      false,
    );
  });

  it("uses API resource names for policy permission resolution", () => {
    expect(Operator.name).toBe("operators");
    expect(Sponsor.name).toBe("sponsors");
    expect(Document.name).toBe("documents");
  });
});
