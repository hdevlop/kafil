import { describe, expect, it } from "bun:test";
import { normalizeMoroccanCin } from "najm-auth/identity/ma";

import { generateInitialPassword } from "../src/initialPassword";
import { normalizePhone } from "../src/phone";

// Login-identity normalization, the CIN temporary credential, and the
// first-login replacement flow are najm-auth's as of AUTH-COOKIE-PLAN.md
// Move 4 and are covered by its own suite. What remains here is the profile
// and provisioning helpers Kafil still owns.
describe("Kafil credential helpers", () => {
  it("normalizes Moroccan local numbers and preserves international numbers", () => {
    expect(normalizePhone("06 12-34-56-78")).toBe("+212612345678");
    expect(normalizePhone("212612345678")).toBe("+212612345678");
    expect(normalizePhone("+33 6 12 34 56 78")).toBe("+33612345678");
    expect(normalizePhone("not-a-phone")).toBeNull();
  });

  it("adds unpredictable digits to the surname and birth-year password", () => {
    expect(generateInitialPassword("Amina El Amrani", "1987-03-12", 4721)).toBe(
      "Amrani1987!4721",
    );
    expect(generateInitialPassword("أمينة", "1987-03-12", 4721)).toBe(
      "Kafil1987!4721",
    );
  });

  // Kafil hands the operator the same string najm-auth hashed, so the two
  // normalizations have to agree.
  it("shows the operator the CIN in the form Najm stored", () => {
    expect(normalizeMoroccanCin("AB123456")).toBe("ab123456");
    expect(normalizeMoroccanCin(" ab123456 ")).toBe("ab123456");
    expect(normalizeMoroccanCin("StrongPass1")).toBe("StrongPass1");
  });
});
