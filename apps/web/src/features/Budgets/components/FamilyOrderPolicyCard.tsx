"use client";

import { useState } from "react";
import { NButton, NCard, useNajmFormat } from "najm-kit";
import { useTranslation } from "najm-i18n/react";

import { useEntityQuery } from "@/hooks/useEntityQuery";
import { getBudgetSummary } from "@/services/budgetApi";
import { getSettings } from "@/services/settingApi";
import { parseMadAmount } from "@/features/Budgets/config/budgetSchemas";
import { budgetKeys } from "@/features/Budgets/hooks/budgetKeys";
import { useBudgetCommands } from "@/features/Budgets/hooks/useBudgetCommands";
import { settingKeys } from "@/features/Settings/hooks/useSettings";
import { Operator } from "@/shared/Authorization";
import type { BudgetSummary } from "@/features/Budgets/types";

function currentMonth(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

function formatSource(
  source: "family" | "global" | "unlimited",
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: any,
) {
  if (source === "family") return t("operator.budgets.sourceFamily") as string;
  if (source === "global") return t("operator.budgets.sourceGlobal") as string;
  return t("operator.budgets.sourceUnlimited") as string;
}

export function FamilyOrderPolicyCard({
  familyProfileId,
}: Readonly<{ familyProfileId: string }>) {
  const { t } = useTranslation();
  const fmt = useNajmFormat();
  const { setOrderPolicy, setMonthlyLimit, resetMonthlyLimit } =
    useBudgetCommands();
  const summary = useEntityQuery<BudgetSummary>({
    queryKey: [...budgetKeys.all, familyProfileId],
    queryFn: () => getBudgetSummary(familyProfileId),
  });
  const settings = useEntityQuery({
    queryKey: settingKeys.all,
    queryFn: getSettings,
  });

  const [maxOrders, setMaxOrders] = useState("");
  const [maxPerOrderMad, setMaxPerOrderMad] = useState("");
  const [monthlyMad, setMonthlyMad] = useState("");
  const [month, setMonth] = useState(currentMonth());
  const [reason, setReason] = useState("");
  const [initialized, setInitialized] = useState(false);

  const data = summary.data;
  if (data && !initialized) {
    setInitialized(true);
  }

  async function handleSavePolicy() {
    const trimmedReason = reason.trim();
    if (trimmedReason.length < 3) return;
    const maxOrdersTrimmed = maxOrders.trim();
    const maxPerOrderTrimmed = maxPerOrderMad.trim();
    let maxOrdersValue: number | null | undefined;
    let maxPerOrderValue: number | null | undefined;
    if (maxOrdersTrimmed !== "") {
      const parsed = Number(maxOrdersTrimmed);
      if (!Number.isInteger(parsed) || parsed < 1 || parsed > 31) return;
      maxOrdersValue = parsed;
    } else if (initialized) {
      // Empty means restore inheritance only when the user explicitly saves
      // with an empty field after seeing an override. To avoid accidental
      // clears, require the field to have been touched: empty string after
      // init means inherit (null) only if there is an existing override.
      maxOrdersValue =
        data?.orders?.override != null ? null : undefined;
    }
    if (maxPerOrderTrimmed !== "") {
      const minor = parseMadAmount(maxPerOrderTrimmed);
      if (minor === null || minor <= 0) return;
      maxPerOrderValue = minor;
    } else if (initialized) {
      maxPerOrderValue =
        data?.maxPerOrder?.override != null ? null : undefined;
    }
    await setOrderPolicy.mutateAsync({
      familyProfileId,
      ...(maxOrdersValue !== undefined
        ? { maxOrdersPerMonth: maxOrdersValue }
        : {}),
      ...(maxPerOrderValue !== undefined
        ? { maxBudgetPerOrderMinor: maxPerOrderValue }
        : {}),
      reason: trimmedReason,
    });
    setMaxOrders("");
    setMaxPerOrderMad("");
  }

  async function handleSaveMonthly() {
    const trimmedReason = reason.trim();
    if (trimmedReason.length < 3) return;
    const minor = parseMadAmount(monthlyMad.trim());
    if (minor === null || minor <= 0) return;
    if (!/^\d{4}-\d{2}-01$/.test(month)) return;
    await setMonthlyLimit.mutateAsync({
      familyProfileId,
      month,
      limitMinor: minor,
      reason: trimmedReason,
    });
    setMonthlyMad("");
  }

  async function handleResetMonthly() {
    const trimmedReason = reason.trim();
    if (trimmedReason.length < 3) return;
    if (!/^\d{4}-\d{2}-01$/.test(month)) return;
    if (!window.confirm(t("operator.budgets.resetMonthlyConfirm"))) return;
    await resetMonthlyLimit.mutateAsync({
      familyProfileId,
      month,
      reason: trimmedReason,
    });
  }

  const globalMaxOrders = settings.data?.defaultMaxOrdersPerMonth ?? null;
  const globalPerOrder = settings.data?.defaultMaxBudgetPerOrderMinor ?? null;
  const globalMonthly = settings.data?.defaultMonthlyBudgetMinor ?? null;

  const ordersEffective = data?.orders?.effective ?? null;
  const ordersSource = data?.orders?.source ?? "unlimited";
  const perOrderEffective = data?.maxPerOrder?.effective ?? null;
  const perOrderSource = data?.maxPerOrder?.source ?? "unlimited";
  const monthlyEffective = data?.monthly?.effective ?? null;
  const monthlySource = data?.monthly?.source ?? "unlimited";

  return (
    <Operator>
      <NCard title={t("operator.budgets.orderPolicyTitle")}>
        <p className="text-sm text-muted-foreground">
          {t("operator.budgets.orderPolicyDescription")}
        </p>
        {summary.isPending ? (
          <p className="text-sm">{t("common.loading")}</p>
        ) : summary.isError || !data ? (
          <NButton
            variant="outline"
            onClick={() => void summary.refetch()}
          >
            {t("action.retry")}
          </NButton>
        ) : (
          <div className="space-y-3">
            <div className="text-sm">
              <span className="font-medium">
                {t("operator.budgets.maxOrdersLabel")}:
              </span>{" "}
              {ordersEffective == null
                ? t("operator.budgets.sourceUnlimited")
                : t("operator.budgets.ordersPerMonthValue", {
                    value: ordersEffective,
                  })}{" "}
              <span className="text-muted-foreground">
                ({t("operator.budgets.effectiveLabel")}:{" "}
                {ordersEffective == null ? "—" : ordersEffective},{" "}
                {formatSource(ordersSource, t)}
                {ordersSource === "family" &&
                data.orders?.default != null
                  ? `; ${t("operator.budgets.sourceGlobal")} ${data.orders.default}`
                  : ""}
                )
              </span>
            </div>
            <div className="text-sm">
              <span className="font-medium">
                {t("operator.budgets.maxPerOrderLabel")}:
              </span>{" "}
              {perOrderEffective == null
                ? t("operator.budgets.sourceUnlimited")
                : fmt.money(perOrderEffective)}{" "}
              <span className="text-muted-foreground">
                ({formatSource(perOrderSource, t)}
                {perOrderSource === "family" &&
                data.maxPerOrder?.default != null
                  ? `; ${t("operator.budgets.sourceGlobal")} ${fmt.money(data.maxPerOrder.default)}`
                  : ""}
                )
              </span>
            </div>
            <div className="text-sm">
              <span className="font-medium">
                {t("operator.budgets.monthlyAmountLabel")}:
              </span>{" "}
              {monthlyEffective == null
                ? t("operator.budgets.sourceUnlimited")
                : fmt.money(monthlyEffective)}{" "}
              <span className="text-muted-foreground">
                ({formatSource(monthlySource, t)}
                {monthlySource === "family" &&
                data.monthly?.default != null
                  ? `; ${t("operator.budgets.sourceGlobal")} ${fmt.money(data.monthly.default)}`
                  : ""}
                )
              </span>
            </div>
            <div className="grid gap-3">
              <label className="grid gap-1 text-sm">
                <span>{t("operator.budgets.maxOrdersLabel")}</span>
                <input
                  aria-label={t("operator.budgets.maxOrdersLabel")}
                  className="h-9 rounded-md border border-border bg-background px-3"
                  value={maxOrders}
                  onChange={(event) => setMaxOrders(event.target.value)}
                  placeholder={
                    globalMaxOrders == null
                      ? ""
                      : t("operator.budgets.maxOrdersPlaceholder", {
                          value: String(globalMaxOrders),
                        })
                  }
                  inputMode="numeric"
                />
              </label>
              <label className="grid gap-1 text-sm">
                <span>{t("operator.budgets.maxPerOrderLabel")}</span>
                <input
                  aria-label={t("operator.budgets.maxPerOrderLabel")}
                  className="h-9 rounded-md border border-border bg-background px-3"
                  value={maxPerOrderMad}
                  onChange={(event) => setMaxPerOrderMad(event.target.value)}
                  placeholder={
                    globalPerOrder == null
                      ? ""
                      : t("operator.budgets.maxPerOrderPlaceholder", {
                          value: fmt.money(globalPerOrder),
                        })
                  }
                  inputMode="decimal"
                />
              </label>
              <label className="grid gap-1 text-sm">
                <span>{t("operator.budgets.reasonPlaceholder")}</span>
                <input
                  aria-label={t("operator.budgets.reasonPlaceholder")}
                  className="h-9 rounded-md border border-border bg-background px-3"
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder={t("operator.budgets.reasonPlaceholder")}
                />
              </label>
              <div className="flex flex-wrap gap-2">
                <NButton
                  onClick={() => void handleSavePolicy()}
                  disabled={
                    setOrderPolicy.isPending || reason.trim().length < 3
                  }
                >
                  {t("operator.budgets.savePolicy")}
                </NButton>
              </div>
              <div className="grid gap-2 border-t border-border pt-3">
                <label className="grid gap-1 text-sm">
                  <span>{t("operator.budgets.month")}</span>
                  <input
                    aria-label={t("operator.budgets.month")}
                    className="h-9 rounded-md border border-border bg-background px-3"
                    value={month}
                    onChange={(event) => setMonth(event.target.value)}
                    placeholder="YYYY-MM-01"
                  />
                </label>
                <label className="grid gap-1 text-sm">
                  <span>{t("operator.budgets.monthlyAmountLabel")}</span>
                  <input
                    aria-label={t("operator.budgets.monthlyAmountLabel")}
                    className="h-9 rounded-md border border-border bg-background px-3"
                    value={monthlyMad}
                    onChange={(event) => setMonthlyMad(event.target.value)}
                    placeholder={
                      globalMonthly == null
                        ? ""
                        : t("operator.budgets.monthlyAmountPlaceholder", {
                            value: fmt.money(globalMonthly),
                          })
                    }
                    inputMode="decimal"
                  />
                </label>
                <div className="flex flex-wrap gap-2">
                  <NButton
                    variant="outline"
                    onClick={() => void handleSaveMonthly()}
                    disabled={
                      setMonthlyLimit.isPending || reason.trim().length < 3
                    }
                  >
                    {t("operator.budgets.saveMonthlyLimit")}
                  </NButton>
                  <NButton
                    variant="outline"
                    onClick={() => void handleResetMonthly()}
                    disabled={
                      resetMonthlyLimit.isPending || reason.trim().length < 3
                    }
                  >
                    {t("operator.budgets.resetMonthly")}
                  </NButton>
                </div>
              </div>
            </div>
          </div>
        )}
      </NCard>
    </Operator>
  );
}
