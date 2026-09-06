import { describe, expect, it } from "bun:test";

import {
  DEMO_FAMILY_ORDER_OVERRIDE_COUNT,
  DEMO_ORDER_LIMIT_DEFAULTS,
  RESET_DEMO_ORDER_LIMITS_SQL,
} from "../src/demo-order-limits";
import { RESET_DEMO_ORDER_LIMITS_SQL as REMOVAL_RESET_SQL } from "../src/remove-demo-data";

describe("demo family order limits", () => {
  it("uses only the confirmed illustrative defaults", () => {
    expect(DEMO_ORDER_LIMIT_DEFAULTS).toEqual({
      defaultMaxOrdersPerMonth: 4,
      defaultMaxBudgetPerOrderMinor: 300_000,
      defaultMonthlyBudgetMinor: 600_000,
    });
    expect(DEMO_FAMILY_ORDER_OVERRIDE_COUNT).toBe(2);
  });

  it("resets globals only when the demo actor still owns the exact defaults", () => {
    expect(RESET_DEMO_ORDER_LIMITS_SQL).toContain("SET default_max_orders_per_month = NULL");
    expect(RESET_DEMO_ORDER_LIMITS_SQL).toContain("default_max_orders_per_month = 4");
    expect(RESET_DEMO_ORDER_LIMITS_SQL).toContain(
      "default_max_budget_per_order_minor = 300000",
    );
    expect(RESET_DEMO_ORDER_LIMITS_SQL).toContain(
      "default_monthly_budget_minor = 600000",
    );
    expect(RESET_DEMO_ORDER_LIMITS_SQL).toContain(
      "updated_by_user_id IN (SELECT id FROM kafil_demo_users)",
    );
    expect(REMOVAL_RESET_SQL).toBe(RESET_DEMO_ORDER_LIMITS_SQL);
  });

  it("never deletes explicit monthly limits while applying demo defaults", async () => {
    const orchestrator = await Bun.file(
      new URL("../src/demo-seed.ts", import.meta.url),
    ).text();
    const seeder = await Bun.file(
      new URL("../src/demo-order-limits.ts", import.meta.url),
    ).text();

    expect(orchestrator).not.toContain("delete(monthlyBudgetLimits)");
    expect(seeder).not.toContain("delete(monthlyBudgetLimits)");
  });
});
