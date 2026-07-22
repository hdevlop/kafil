import { describe, expect, test } from "bun:test";

import { normalizeKafilLanguage } from "../src/lib/format";
import { familyOrderingKeys } from "../src/features/FamilyOrdering/hooks/familyOrderingKeys";

describe("Phase 6E family ordering contracts", () => {
  test("keeps cart and family order cache keys isolated", () => {
    expect(familyOrderingKeys.cart).toEqual(["family-ordering", "detail", "cart"]);
    expect(familyOrderingKeys.orders({ limit: 12, offset: 24 })).toEqual([
      "family-orders",
      "list",
      { limit: 12, offset: 24 },
    ]);
  });

  test("normalizes the supported document languages for formatting and direction", () => {
    expect(normalizeKafilLanguage("ar")).toBe("ar");
    expect(normalizeKafilLanguage("fr")).toBe("fr");
    expect(normalizeKafilLanguage("unknown")).toBe("en");
  });
});
