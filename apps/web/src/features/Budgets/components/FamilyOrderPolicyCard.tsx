"use client";

import { ShoppingCart } from "lucide-react";
import { NButton, NDetailItem, NSection, useNajmFormat } from "najm-kit";
import { useTranslation } from "najm-i18n/react";
import { useEntityQuery } from "najm-kit/query";

import { getBudgetSummary } from "@/services/budgetApi";
import { budgetKeys } from "@/features/Budgets/hooks/budgetKeys";
import type { BudgetSummary } from "@/features/Budgets/types";

export function FamilyOrderPolicyCard({
  familyProfileId,
}: Readonly<{ familyProfileId: string }>) {
  const { t } = useTranslation();
  const fmt = useNajmFormat();
  const summary = useEntityQuery<BudgetSummary>({
    queryKey: [...budgetKeys.all, familyProfileId],
    queryFn: () => getBudgetSummary(familyProfileId),
  });
  const data = summary.data;

  return (
    <NSection icon={ShoppingCart} title={t("operator.budgets.orderPolicyTitle")}>
      {summary.isPending ? (
        <p className="text-sm">{t("common.loading")}</p>
      ) : summary.isError || !data ? (
        <NButton variant="outline" onClick={() => void summary.refetch()}>
          {t("action.retry")}
        </NButton>
      ) : (
        <>
          <NDetailItem
            label={t("operator.budgets.maxOrdersLabel")}
            value={data.orders?.effective == null
              ? t("operator.budgets.sourceUnlimited")
              : t("operator.budgets.ordersPerMonthValue", {
                  value: data.orders.effective,
                })}
          />
          <NDetailItem
            label={t("operator.budgets.monthlyAmountLabel")}
            value={data.monthly?.effective == null
              ? t("operator.budgets.sourceUnlimited")
              : fmt.money(data.monthly.effective)}
          />
        </>
      )}
    </NSection>
  );
}
