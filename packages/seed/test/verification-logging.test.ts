import { describe, expect, it } from "bun:test";

import { verificationLines } from "../src/run-seed";

describe("seed verification logging", () => {
  it("reports authorization health without exposing the admin identity", () => {
    const lines = verificationLines({
      admin: { email: "private-admin@example.test" },
      permissionCount: 45,
      roles: [
        { name: "admin", permissionCount: 45 },
        { name: "delivery", permissionCount: 0 },
      ],
    });

    expect(lines).toEqual([
      "Admin: active verified admin",
      "Permissions: 45",
      "Role admin: 45 permissions",
      "Role delivery: 0 permissions",
    ]);
    expect(lines.join("\n")).not.toContain("private-admin@example.test");
  });
});
