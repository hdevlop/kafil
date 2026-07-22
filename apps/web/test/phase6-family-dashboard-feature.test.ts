import { describe, expect, test } from "bun:test";

import { getFamilyChildStatusCounts } from "../src/features/FamilyDashboard/config/familyChildSummary";
import { familyDashboardKeys } from "../src/features/FamilyDashboard/hooks/familyDashboardKeys";
import { contributionKeys } from "../src/features/Contributions/hooks/contributionKeys";

describe("Phase 6E family household and children contracts", () => {
  test("counts active and inactive child records without changing their lifecycle", () => {
    expect(
      getFamilyChildStatusCounts([
        { id: "child-1", status: "active" },
        { id: "child-2", status: "inactive" },
        { id: "child-3", status: "active" },
      ] as never),
    ).toEqual({ total: 3, active: 2, inactive: 1 });
  });

  test("keeps separate stable profile and family-owned children query keys", () => {
    expect(familyDashboardKeys.profile).toEqual([
      "family-dashboard",
      "detail",
      "profile",
    ]);
    expect(familyDashboardKeys.children).toEqual([
      "family-dashboard",
      "list",
      { resource: "children" },
    ]);
  });

  test("keeps recent family sponsor contributions separate in the query cache", () => {
    expect(
      contributionKeys.list({
        familyProfileId: "11111111-1111-4111-8111-111111111111",
        limit: 3,
        offset: 0,
      }),
    ).toEqual([
      "contributions",
      "list",
      {
        familyProfileId: "11111111-1111-4111-8111-111111111111",
        limit: 3,
        offset: 0,
        status: undefined,
      },
    ]);
  });
});
