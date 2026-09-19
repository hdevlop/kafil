import { describe, expect, it } from "bun:test";

import { familySponsorName } from "../src/lib/familySponsorName";

describe("family sponsor name", () => {
  it("replaces all names after the first with a fixed mask", () => {
    expect(familySponsorName("Abderrahman Bellaoui")).toBe("Abderrahman ***");
    expect(familySponsorName("Abderrahman Bellaoui Jr")).toBe("Abderrahman ***");
  });

  it("is idempotent for already masked responses", () => {
    expect(familySponsorName("Abderrahman ***")).toBe("Abderrahman ***");
  });

  it("handles missing names without exposing a surname", () => {
    expect(familySponsorName(null)).toBe("");
  });
});
