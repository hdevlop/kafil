import { describe, expect, it } from "bun:test";

import {
  AUTH_PERMISSIONS,
  AUTH_ROLE_PERMISSIONS,
  AUTH_ROLES,
} from "../src/auth-definitions";

describe("auth seed definitions", () => {
  it("keeps the Najm bootstrap admin separate from product roles", () => {
    expect(AUTH_ROLES.map((role) => role.name)).toEqual([
      "admin",
      "operator",
      "family",
      "sponsor",
    ]);
  });

  it("uses unique permission names with matching action/resource pairs", () => {
    const names = AUTH_PERMISSIONS.map((permission) => permission.name);
    expect(names).toEqual([
      "read:operators",
      "create:operators",
      "update:operators",
      "delete:operators",
      "read:sponsors",
      "create:sponsors",
      "update:sponsors",
      "delete:sponsors",
      "read:families",
      "create:families",
      "update:families",
      "delete:families",
      "read:children",
      "create:children",
      "update:children",
      "delete:children",
      "read:supportAssignments",
      "create:supportAssignments",
      "update:supportAssignments",
      "read:contributions",
      "create:contributions",
      "update:contributions",
      "delete:contributions",
      "read:budgets",
      "update:budgets",
      "read:settings",
      "update:settings",
      "read:audit-events",
      "read:documents",
      "create:documents",
      "update:documents",
      "delete:documents",
    ]);
    expect(new Set(names).size).toBe(names.length);
    for (const permission of AUTH_PERMISSIONS) {
      expect(permission.name).toBe(
        `${permission.action}:${permission.resource}`,
      );
    }
  });

  it("grants operators workflow permissions without broad operator access", () => {
    expect(AUTH_ROLE_PERMISSIONS.admin).toEqual(
      AUTH_PERMISSIONS.map((permission) => permission.name),
    );
    expect(AUTH_ROLE_PERMISSIONS.operator).toContain("read:sponsors");
    expect(AUTH_ROLE_PERMISSIONS.operator).toContain("delete:documents");
    expect(AUTH_ROLE_PERMISSIONS.operator).toContain("create:families");
    expect(AUTH_ROLE_PERMISSIONS.operator).toContain("update:children");
    expect(AUTH_ROLE_PERMISSIONS.operator).not.toContain("delete:families");
    expect(AUTH_ROLE_PERMISSIONS.operator).not.toContain("delete:children");
    expect(AUTH_ROLE_PERMISSIONS.operator).toContain(
      "create:supportAssignments",
    );
    expect(AUTH_ROLE_PERMISSIONS.operator).toContain("create:contributions");
    expect(AUTH_ROLE_PERMISSIONS.operator).toContain("update:contributions");
    expect(AUTH_ROLE_PERMISSIONS.operator).not.toContain("delete:contributions");
    expect(AUTH_ROLE_PERMISSIONS.operator).toContain("update:budgets");
    expect(AUTH_ROLE_PERMISSIONS.operator).toContain("update:settings");
    expect(AUTH_ROLE_PERMISSIONS.operator).not.toContain("read:operators");
    expect(AUTH_ROLE_PERMISSIONS.family).toEqual([
      "read:families",
      "read:children",
      "read:budgets",
    ]);
    expect(AUTH_ROLE_PERMISSIONS.sponsor).toEqual([
      "read:sponsors",
      "create:sponsors",
      "update:sponsors",
      "read:supportAssignments",
      "create:supportAssignments",
      "read:contributions",
      "create:contributions",
      "update:contributions",
    ]);
  });
});
