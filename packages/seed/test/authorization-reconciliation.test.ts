import { describe, expect, it } from "bun:test";

import {
  assertMergeableDuplicates,
  desiredManagedGrants,
  describeRepair,
  findDuplicateRoleNames,
  grantKey,
  parseGrantKey,
  planManagedGrants,
  selectCanonicalRole,
  uniqueRowsByName,
  type RoleRow,
} from "../src/authorization-reconciliation";
import { AUTH_ROLE_PERMISSIONS } from "../src/auth-definitions";
import { stableSeedId } from "../src/seed-ids";

function role(id: string, createdAt: string | null, name = "delivery"): RoleRow {
  return { createdAt, id, name };
}

describe("deterministic seed identifiers", () => {
  it("matches the normalization Najm's auth seed applies to role names", () => {
    expect(stableSeedId("role", "delivery")).toBe("role_delivery");
    expect(stableSeedId("permission", "read:audit-events")).toBe(
      "permission_read_audit_events",
    );
    expect(stableSeedId("role", "!!!")).toBe("role_item");
  });
});

describe("canonical fixed-role selection", () => {
  it("prefers the deterministic seed ID over an older legacy row", () => {
    const rows = [
      role("Ab3xZ", "2024-01-01 00:00:00"),
      role("role_delivery", "2026-09-01 00:00:00"),
    ];
    expect(selectCanonicalRole(rows).id).toBe("role_delivery");
  });

  it("keeps the oldest row when no deterministic seed ID exists", () => {
    const rows = [
      role("zzzzz", "2026-01-01 00:00:00"),
      role("aaaaa", "2024-05-05 00:00:00"),
    ];
    expect(selectCanonicalRole(rows).id).toBe("aaaaa");
  });

  it("breaks an identical-timestamp tie on the role ID", () => {
    const rows = [
      role("bbbbb", "2024-05-05 00:00:00"),
      role("aaaaa", "2024-05-05 00:00:00"),
    ];
    expect(selectCanonicalRole(rows).id).toBe("aaaaa");
  });

  it("never treats an unknown creation time as the oldest row", () => {
    const rows = [role("zzzzz", null), role("aaaaa", "2024-05-05 00:00:00")];
    expect(selectCanonicalRole(rows).id).toBe("aaaaa");
  });

  it("is order-independent", () => {
    const rows = [
      role("ccccc", "2025-01-01 00:00:00"),
      role("aaaaa", "2024-05-05 00:00:00"),
      role("bbbbb", "2024-05-05 00:00:00"),
    ];
    expect(selectCanonicalRole(rows).id).toBe("aaaaa");
    expect(selectCanonicalRole([...rows].reverse()).id).toBe("aaaaa");
  });

  it("refuses to choose from zero rows", () => {
    expect(() => selectCanonicalRole([])).toThrow(
      "Cannot select a canonical role from zero rows.",
    );
  });
});

describe("duplicate role-name policy", () => {
  it("reports every duplicated role name with its count", () => {
    const duplicates = findDuplicateRoleNames([
      role("a", null, "delivery"),
      role("b", null, "delivery"),
      role("c", null, "auditor"),
      role("d", null, "auditor"),
      role("e", null, "auditor"),
      role("f", null, "sponsor"),
    ]);

    expect(duplicates).toEqual([
      { count: 3, name: "auditor" },
      { count: 2, name: "delivery" },
    ]);
  });

  it("consolidates duplicated fixed roles automatically", () => {
    expect(() =>
      assertMergeableDuplicates([{ count: 2, name: "delivery" }]),
    ).not.toThrow();
  });

  it("refuses to merge duplicated custom role names", () => {
    expect(() =>
      assertMergeableDuplicates([
        { count: 2, name: "auditor" },
        { count: 2, name: "delivery" },
      ]),
    ).toThrow(
      "Duplicate custom role names require manual review before consolidation: auditor (2).",
    );
  });
});

describe("exact managed-grant comparison", () => {
  it("derives the expected per-role managed grant counts", () => {
    const desired = desiredManagedGrants();
    const counts = new Map<string, number>();
    for (const key of desired) {
      const { roleName } = parseGrantKey(key);
      counts.set(roleName, (counts.get(roleName) ?? 0) + 1);
    }

    expect(counts.get("admin")).toBe(AUTH_ROLE_PERMISSIONS.admin.length);
    expect(counts.get("operator")).toBe(AUTH_ROLE_PERMISSIONS.operator.length);
    expect(counts.get("delivery")).toBe(AUTH_ROLE_PERMISSIONS.delivery.length);
    expect(counts.get("family")).toBe(AUTH_ROLE_PERMISSIONS.family.length);
    expect(counts.get("sponsor")).toBe(AUTH_ROLE_PERMISSIONS.sponsor.length);
  });

  it("reports nothing to change when the live set already matches", () => {
    expect(planManagedGrants(desiredManagedGrants())).toEqual({
      add: [],
      remove: [],
    });
  });

  it("adds every missing managed grant after a destructive clear", () => {
    const { add, remove } = planManagedGrants([]);
    expect(remove).toEqual([]);
    expect(add).toHaveLength(desiredManagedGrants().size);
  });

  it("treats an extra managed grant as drift, not a passing superset", () => {
    const live = new Set(desiredManagedGrants());
    live.add(grantKey("delivery", "read:families"));

    const { add, remove } = planManagedGrants(live);
    expect(add).toEqual([]);
    expect(remove.map(parseGrantKey)).toEqual([
      { permissionName: "read:families", roleName: "delivery" },
    ]);
  });

  it("restores a role whose managed grants were wiped", () => {
    const live = [...desiredManagedGrants()].filter(
      (key) => parseGrantKey(key).roleName !== "sponsor",
    );

    const { add, remove } = planManagedGrants(live);
    expect(remove).toEqual([]);
    expect(add.every((key) => parseGrantKey(key).roleName === "sponsor")).toBe(
      true,
    );
    expect(add).toHaveLength(AUTH_ROLE_PERMISSIONS.sponsor.length);
  });

  it("grants Delivery only its own notification inbox", () => {
    const deliveryGrants = [...desiredManagedGrants()].filter(
      (key) => parseGrantKey(key).roleName === "delivery",
    );
    expect(deliveryGrants.map((key) => parseGrantKey(key).permissionName)).toEqual([
      "read:notifications",
      "update:notifications",
    ]);
  });
});

describe("sanitized repair summaries", () => {
  const repair = {
    consolidatedRoles: [
      { duplicatesRemoved: 1, name: "delivery" as const, usersMoved: 3 },
    ],
    grantLinksAdded: 43,
    grantLinksRemoved: 2,
    invalidatedUsers: 7,
    rolesCreated: [],
  };

  it("reports counts and role names only", () => {
    const summary = describeRepair(repair);
    expect(summary).toContain("roles consolidated: 1");
    expect(summary).toContain("delivery");
    expect(summary).toContain("3 user(s) moved");
    expect(summary).toContain("managed grants added: 43");
    expect(summary).toContain("managed grants removed: 2");
    expect(summary).toContain("sessions invalidated: 7");
  });

  it("omits role IDs, user IDs, and credential material", () => {
    const summary = describeRepair(repair);
    for (const secret of [
      "role_delivery",
      "@",
      "password",
      "token",
      "DATABASE_URL",
      "redis",
    ]) {
      expect(summary.toLowerCase()).not.toContain(secret.toLowerCase());
    }
  });

  it("describes a clean idempotent rerun as zero work", () => {
    const summary = describeRepair({
      consolidatedRoles: [],
      grantLinksAdded: 0,
      grantLinksRemoved: 0,
      invalidatedUsers: 0,
      rolesCreated: [],
    });
    expect(summary).toBe(
      "roles created: 0; roles consolidated: 0; managed grants added: 0; managed grants removed: 0; sessions invalidated: 0",
    );
  });
});

describe("unique row resolution", () => {
  it("names the duplicated row it refuses to resolve", () => {
    expect(() =>
      uniqueRowsByName(
        [
          { id: "a", name: "delivery" },
          { id: "b", name: "delivery" },
        ],
        ["delivery"],
        "role",
      ),
    ).toThrow("Expected exactly one role named 'delivery', found 2.");
  });

  it("names a missing row rather than returning undefined", () => {
    expect(() => uniqueRowsByName([], ["sponsor"], "role")).toThrow(
      "Expected exactly one role named 'sponsor', found 0.",
    );
  });
});
