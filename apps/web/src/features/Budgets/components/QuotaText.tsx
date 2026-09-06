"use client";

import { useNajmFormat } from "najm-kit";
import { useTranslation } from "najm-i18n/react";

import { resolveOrdersRemaining } from "@/features/Budgets/lib/quota";

export function QuotaText({
  ordersUsed,
  ordersLimit,
  ordersRemaining,
  maxPerOrderMinor,
}: Readonly<{
  ordersUsed?: number | null;
  ordersLimit?: number | null;
  ordersRemaining?: number | null;
  maxPerOrderMinor?: number | null;
}>) {
  const { t } = useTranslation();
  const fmt = useNajmFormat();
  const remaining = resolveOrdersRemaining({
    ordersUsed,
    ordersLimit,
    ordersRemaining,
  });

  if (ordersLimit == null && maxPerOrderMinor == null) {
    return (
      <span aria-live="polite">
        {t("operator.budgets.quotaUnlimited")}
      </span>
    );
  }

  const parts: string[] = [];
  if (ordersLimit != null && remaining != null) {
    parts.push(
      t("operator.budgets.quotaRemaining", {
        remaining,
        limit: ordersLimit,
      }),
    );
  } else if (ordersLimit != null) {
    parts.push(
      t("operator.budgets.quotaUsed", {
        used: ordersUsed ?? 0,
        limit: ordersLimit,
      }),
    );
  }
  if (maxPerOrderMinor != null) {
    parts.push(
      t("operator.budgets.perOrderUpTo", {
        amount: fmt.money(maxPerOrderMinor),
      }),
    );
  }
  return <span aria-live="polite">{parts.join(" · ")}</span>;
}

export function FamilyQuotaText({
  ordersUsed,
  ordersLimit,
  ordersRemaining,
  maxPerOrderMinor,
}: Readonly<{
  ordersUsed?: number | null;
  ordersLimit?: number | null;
  ordersRemaining?: number | null;
  maxPerOrderMinor?: number | null;
}>) {
  const { t } = useTranslation();
  const fmt = useNajmFormat();
  const remaining = resolveOrdersRemaining({
    ordersUsed,
    ordersLimit,
    ordersRemaining,
  });

  if (ordersLimit == null && maxPerOrderMinor == null) {
    return (
      <span aria-live="polite">
        {t("family.orderCart.quotaUnlimitedOrders")}
      </span>
    );
  }

  if (
    ordersLimit != null &&
    remaining != null &&
    maxPerOrderMinor != null
  ) {
    return (
      <span aria-live="polite">
        {t("family.orderCart.quotaRemaining", {
          remaining,
          limit: ordersLimit,
          amount: fmt.money(maxPerOrderMinor),
        })}
      </span>
    );
  }

  return (
    <QuotaText
      ordersUsed={ordersUsed}
      ordersLimit={ordersLimit}
      ordersRemaining={ordersRemaining}
      maxPerOrderMinor={maxPerOrderMinor}
    />
  );
}
