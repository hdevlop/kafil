import { describe, expect, it } from "bun:test";
import { normalizeMoroccanCin } from "najm-auth/identity/ma";

import { generateInitialPassword } from "../src/initialPassword";

// Login-identity normalization, the CIN temporary credential, and the
// first-login replacement flow are owned and tested by najm-auth. What remains
// here is the provisioning helpers Kafil still owns. Profile phone
// normalization is shared and tested in @kafil/contracts.
describe("Kafil credential helpers", () => {
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
