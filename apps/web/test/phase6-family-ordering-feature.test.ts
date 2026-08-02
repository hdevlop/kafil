import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

import { normalizeKafilLanguage } from "../src/lib/format";
import { familyOrderingKeys } from "../src/features/Orders/hooks/familyOrderingKeys";

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

  test("renders the privacy-safe delivery person and refreshes order details", () => {
    const details = readFileSync(
      new URL("../src/features/Orders/components/OrderDetails.tsx", import.meta.url),
      "utf8",
    );
    const hooks = readFileSync(
      new URL("../src/features/Orders/hooks/useFamilyOrdering.ts", import.meta.url),
      "utf8",
    );

    expect(details).toContain("<DeliveryPersonCard");
    expect(details).toContain("delivery={data.delivery}");
    expect(hooks).toContain("staleTime: 0");
  });
});
