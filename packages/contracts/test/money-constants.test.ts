import { expect, it } from "bun:test";

import { KAFIL_CURRENCY } from "../src/money/constants";

// Every stored amount is integer minor units of this one currency; the server
// money DTOs and the web formatting default both read it from here.
it("keeps Moroccan dirham as the only currency", () => {
  expect(KAFIL_CURRENCY).toBe("MAD");
});
