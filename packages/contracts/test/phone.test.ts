import { describe, expect, it } from "bun:test";

import { normalizePhone } from "../src/phone";

describe("normalizePhone", () => {
  it("normalizes Moroccan local numbers and preserves international numbers", () => {
    expect(normalizePhone("06 12-34-56-78")).toBe("+212612345678");
    expect(normalizePhone("212612345678")).toBe("+212612345678");
    expect(normalizePhone("+33 6 12 34 56 78")).toBe("+33612345678");
  });

  it("rejects values that are not an E.164 number after normalization", () => {
    expect(normalizePhone("not-a-phone")).toBeNull();
    expect(normalizePhone("+0612345678")).toBeNull();
    expect(normalizePhone("0612")).toBeNull();
  });
});
