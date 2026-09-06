import {
  budgetAccounts,
  db,
  platformSettings,
} from "@kafil/server/database";
import { eq, inArray } from "drizzle-orm";

export const DEMO_ORDER_LIMIT_DEFAULTS = {
  defaultMaxOrdersPerMonth: 4,
  defaultMaxBudgetPerOrderMinor: 300_000,
  defaultMonthlyBudgetMinor: 600_000,
} as const;

export const DEMO_FAMILY_ORDER_OVERRIDE_COUNT = 2;

export async function seedDemoOrderLimits(input: {
  demoOperatorUserId: string;
  demoFamilyIds: string[];
}) {
  await db
    .update(platformSettings)
    .set({
      defaultMaxOrdersPerMonth:
        DEMO_ORDER_LIMIT_DEFAULTS.defaultMaxOrdersPerMonth,
      defaultMaxBudgetPerOrderMinor:
        DEMO_ORDER_LIMIT_DEFAULTS.defaultMaxBudgetPerOrderMinor,
      defaultMonthlyBudgetMinor:
        DEMO_ORDER_LIMIT_DEFAULTS.defaultMonthlyBudgetMinor,
      updatedByUserId: input.demoOperatorUserId,
      updatedAt: new Date(),
    })
    .where(eq(platformSettings.id, "platform"));

  const [firstFamilyId] = input.demoFamilyIds;
  if (firstFamilyId) {
    const [account] = await db
      .select({ id: budgetAccounts.id })
      .from(budgetAccounts)
      .where(eq(budgetAccounts.familyProfileId, firstFamilyId))
      .limit(1);
    if (account) {
      await db
        .update(budgetAccounts)
        .set({
          maxOrdersPerMonth: DEMO_FAMILY_ORDER_OVERRIDE_COUNT,
          updatedAt: new Date(),
        })
        .where(eq(budgetAccounts.id, account.id));
    }
  }
}

export async function verifyDemoOrderLimits(demoFamilyIds: string[]) {
  const [settings] = await db
    .select({
      defaultMaxOrdersPerMonth: platformSettings.defaultMaxOrdersPerMonth,
      defaultMaxBudgetPerOrderMinor:
        platformSettings.defaultMaxBudgetPerOrderMinor,
      defaultMonthlyBudgetMinor: platformSettings.defaultMonthlyBudgetMinor,
    })
    .from(platformSettings)
    .where(eq(platformSettings.id, "platform"))
    .limit(1);
  if (
    settings?.defaultMaxOrdersPerMonth !==
      DEMO_ORDER_LIMIT_DEFAULTS.defaultMaxOrdersPerMonth ||
    settings?.defaultMaxBudgetPerOrderMinor !==
      DEMO_ORDER_LIMIT_DEFAULTS.defaultMaxBudgetPerOrderMinor ||
    settings?.defaultMonthlyBudgetMinor !==
      DEMO_ORDER_LIMIT_DEFAULTS.defaultMonthlyBudgetMinor
  ) {
    throw new Error(
      "Demo order-limit globals do not match the illustrative 4 / 300000 / 600000 defaults.",
    );
  }

  if (demoFamilyIds.length === 0) return;
  const accounts = await db
    .select({
      familyProfileId: budgetAccounts.familyProfileId,
      maxOrdersPerMonth: budgetAccounts.maxOrdersPerMonth,
      maxBudgetPerOrderMinor: budgetAccounts.maxBudgetPerOrderMinor,
      id: budgetAccounts.id,
    })
    .from(budgetAccounts)
    .where(inArray(budgetAccounts.familyProfileId, demoFamilyIds));
  const byFamily = new Map(
    accounts.map((row) => [row.familyProfileId, row]),
  );
  const [firstFamilyId] = demoFamilyIds;
  const first = firstFamilyId ? byFamily.get(firstFamilyId) : undefined;
  if (!first || first.maxOrdersPerMonth !== DEMO_FAMILY_ORDER_OVERRIDE_COUNT) {
    throw new Error(
      "Demo verification expected the first demo family to carry max_orders_per_month = 2.",
    );
  }
  for (const familyId of demoFamilyIds.slice(1)) {
    const row = byFamily.get(familyId);
    if (row && row.maxOrdersPerMonth != null) {
      throw new Error(
        "Demo verification expected non-first demo families to inherit the global order count.",
      );
    }
    if (row && row.maxBudgetPerOrderMinor != null) {
      throw new Error(
        "Demo verification expected non-first demo families to inherit the global per-order ceiling.",
      );
    }
  }

}

export const RESET_DEMO_ORDER_LIMITS_SQL = `UPDATE platform_settings
  SET default_max_orders_per_month = NULL,
      default_max_budget_per_order_minor = NULL,
      default_monthly_budget_minor = NULL
  WHERE id = 'platform'
    AND default_max_orders_per_month = 4
    AND default_max_budget_per_order_minor = 300000
    AND default_monthly_budget_minor = 600000
    AND updated_by_user_id IN (SELECT id FROM kafil_demo_users)`;

export async function guardedResetDemoOrderLimits(
  query: (statement: string) => Promise<unknown>,
) {
  await query(RESET_DEMO_ORDER_LIMITS_SQL);
}
