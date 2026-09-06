import { getApiErrorMessage } from "@/services/apiError";

const ORDER_LIMIT_MESSAGE_KEYS = {
  "Order total exceeds the available budget":
    "operator.budgets.denialAvailable",
  "Order total exceeds the remaining monthly limit":
    "operator.budgets.denialMonthly",
  "Monthly order count limit reached": "operator.budgets.denialCount",
  "Order total exceeds the per-order limit":
    "operator.budgets.denialPerOrder",
} as const;

type OrderLimitMessage = keyof typeof ORDER_LIMIT_MESSAGE_KEYS;
type OrderLimitTranslationKey =
  (typeof ORDER_LIMIT_MESSAGE_KEYS)[OrderLimitMessage];

export function getLocalizedOrderLimitError(
  error: unknown,
  translate: (key: OrderLimitTranslationKey) => string,
  fallback: string,
) {
  const message = getApiErrorMessage(error);
  const key = ORDER_LIMIT_MESSAGE_KEYS[message as OrderLimitMessage];
  return key ? translate(key) : fallback;
}
