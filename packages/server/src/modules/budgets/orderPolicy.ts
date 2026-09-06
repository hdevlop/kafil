export type OrderPolicySource = "family" | "global" | "unlimited";

export interface LockedBudgetAccountPolicy {
  id: string;
  maxOrdersPerMonth: number | null;
  maxBudgetPerOrderMinor: number | null;
}

export interface GlobalOrderDefaults {
  defaultMaxOrdersPerMonth: number | null;
  defaultMaxBudgetPerOrderMinor: number | null;
  defaultMonthlyBudgetMinor: number | null;
}

export interface MonthlyOverride {
  limitMinor: number;
}

export interface ResolvedOrderPolicy {
  monthlyLimitMinor: number | null;
  monthlySource: OrderPolicySource;
  monthlyOverrideMinor: number | null;
  monthlyDefaultMinor: number | null;
  maxOrders: number | null;
  maxOrdersSource: OrderPolicySource;
  maxOrdersOverride: number | null;
  maxOrdersDefault: number | null;
  maxPerOrderMinor: number | null;
  maxPerOrderSource: OrderPolicySource;
  maxPerOrderOverride: number | null;
  maxPerOrderDefault: number | null;
}

export function resolveOrderPolicy(
  lockedAccount: LockedBudgetAccountPolicy,
  monthlyOverride: MonthlyOverride | null | undefined,
  settings: GlobalOrderDefaults | null | undefined,
): ResolvedOrderPolicy {
  const monthlyOverrideMinor = monthlyOverride?.limitMinor ?? null;
  const monthlyDefaultMinor = settings?.defaultMonthlyBudgetMinor ?? null;
  const monthlyLimitMinor = monthlyOverrideMinor ?? monthlyDefaultMinor ?? null;
  const monthlySource: OrderPolicySource =
    monthlyOverrideMinor !== null
      ? "family"
      : monthlyDefaultMinor !== null
        ? "global"
        : "unlimited";

  const maxOrdersOverride = lockedAccount.maxOrdersPerMonth ?? null;
  const maxOrdersDefault = settings?.defaultMaxOrdersPerMonth ?? null;
  const maxOrders = maxOrdersOverride ?? maxOrdersDefault ?? null;
  const maxOrdersSource: OrderPolicySource =
    maxOrdersOverride !== null
      ? "family"
      : maxOrdersDefault !== null
        ? "global"
        : "unlimited";

  const maxPerOrderOverride = lockedAccount.maxBudgetPerOrderMinor ?? null;
  const maxPerOrderDefault = settings?.defaultMaxBudgetPerOrderMinor ?? null;
  const maxPerOrderMinor = maxPerOrderOverride ?? maxPerOrderDefault ?? null;
  const maxPerOrderSource: OrderPolicySource =
    maxPerOrderOverride !== null
      ? "family"
      : maxPerOrderDefault !== null
        ? "global"
        : "unlimited";

  return {
    monthlyLimitMinor,
    monthlySource,
    monthlyOverrideMinor,
    monthlyDefaultMinor,
    maxOrders,
    maxOrdersSource,
    maxOrdersOverride,
    maxOrdersDefault,
    maxPerOrderMinor,
    maxPerOrderSource,
    maxPerOrderOverride,
    maxPerOrderDefault,
  };
}

export function monthBounds(month: string): {
  start: Date;
  nextStart: Date;
} {
  const start = new Date(`${month}T00:00:00.000Z`);
  const nextStart = new Date(
    Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1),
  );
  return { start, nextStart };
}

export function currentMonth(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-01`;
}
