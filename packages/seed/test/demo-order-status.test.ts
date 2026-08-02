import { describe, expect, it } from "bun:test";

import { isDemoOrderStatusCompatible } from "../src/demo-order-status";

describe("demo order rerun status compatibility", () => {
  it("preserves a managed order that a user advanced beyond its fixture", () => {
    expect(isDemoOrderStatusCompatible("approved", "pending")).toBe(true);
    expect(isDemoOrderStatusCompatible("delivered", "approved")).toBe(true);
    expect(isDemoOrderStatusCompatible("delivered", "purchased")).toBe(true);
  });

  it("does not treat incompatible or regressed branches as repaired", () => {
    expect(isDemoOrderStatusCompatible("pending", "approved")).toBe(false);
    expect(isDemoOrderStatusCompatible("rejected", "approved")).toBe(false);
    expect(isDemoOrderStatusCompatible("cancelled", "rejected")).toBe(false);
  });
});
