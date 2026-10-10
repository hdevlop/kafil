import { describe, expect, it } from "bun:test";

import * as modules from "../src/modules";

/**
 * Every ownership policy token: its resource name (the permission names
 * read:<name>, update:<name>, ... come from it), the roles that bypass
 * ownership, and the roles with a scoped rule. Pinned so a change to how
 * tokens are declared cannot rename a permission or widen a role.
 */
const EXPECTED = [
  { exportName: "Budget", name: "budgets", adminRoles: ["admin","operator"], roles: ["family"] },
  { exportName: "Catalog", name: "catalog", adminRoles: ["admin","operator"], roles: [] },
  { exportName: "Child", name: "children", adminRoles: ["admin","operator"], roles: ["family"] },
  { exportName: "Contribution", name: "contributions", adminRoles: ["admin","operator"], roles: ["sponsor"] },
  { exportName: "Document", name: "documents", adminRoles: ["admin","operator"], roles: [] },
  { exportName: "Family", name: "families", adminRoles: ["admin","operator"], roles: ["family"] },
  { exportName: "Notification", name: "notifications", adminRoles: [], roles: ["admin","delivery","family","operator","sponsor"] },
  { exportName: "OrderResource", name: "orders", adminRoles: ["admin","operator"], roles: [] },
  { exportName: "PlatformSettingPolicy", name: "settings", adminRoles: ["admin","operator"], roles: [] },
  { exportName: "Sponsor", name: "sponsors", adminRoles: ["admin","operator"], roles: ["sponsor"] },
  { exportName: "Staff", name: "staff", adminRoles: ["admin"], roles: [] },
  { exportName: "StaffDeliveryOptions", name: "staffDeliveryOptions", adminRoles: ["admin","operator"], roles: [] },
  { exportName: "SupportAssignment", name: "supportAssignments", adminRoles: ["admin","operator"], roles: ["sponsor"] },
];

type TokenLike = {
  name: string;
  for: unknown;
  applyScopeSplit: unknown;
  getRules(): Record<string, unknown>;
  _adminRoles?: string[];
};

const isToken = (value: unknown): value is TokenLike =>
  !!value && typeof value === "object"
  && typeof (value as TokenLike).for === "function"
  && typeof (value as TokenLike).applyScopeSplit === "function";

describe("policy tokens", () => {
  it("keep their resource names, admin roles and scoped roles", () => {
    const actual = Object.entries(modules)
      .filter(([, value]) => isToken(value))
      .map(([exportName, token]) => {
        const policy = token as unknown as TokenLike;
        return {
          exportName,
          name: policy.name,
          adminRoles: policy._adminRoles ?? null,
          roles: Object.keys(policy.getRules()).sort(),
        };
      })
      .sort((a, b) => a.exportName.localeCompare(b.exportName));

    expect(actual).toEqual(EXPECTED);
  });
});
