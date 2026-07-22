"use client";

import { CalendarDays, SlidersHorizontal } from "lucide-react";
import { FormInput, NButton, NForm, NFormSectionHeader, useDialog } from "najm-kit";

import { useKafilLanguage } from "@/i18n/KafilLanguageProvider";
import { devFormTools } from "@/lib/devFormFill";

import {
  currentMonthFirstDay,
  manualBudgetAdjustmentFormSchema,
  minorUnitsToMadInput,
  monthlyBudgetLimitFormSchema,
  toManualBudgetAdjustmentInput,
  toMonthlyBudgetLimitInput,
  type ManualBudgetAdjustmentFormValues,
  type MonthlyBudgetLimitFormValues,
} from "../config/budgetSchemas";
import { useBudgetCommands } from "../hooks/useBudgets";
import type { BudgetSummary } from "../types";

export function MonthlyBudgetLimitDialogContent({
  familyProfileId,
  summary,
}: Readonly<{
  familyProfileId: string;
  summary: BudgetSummary;
}>) {
  const { t } = useKafilLanguage();
  const { pop } = useDialog();
  const { setMonthlyLimit } = useBudgetCommands();

  async function handleSubmit(values: MonthlyBudgetLimitFormValues) {
    await setMonthlyLimit.mutateAsync({
      familyProfileId,
      input: toMonthlyBudgetLimitInput(values),
    });
    await pop();
  }

  return (
    <NForm
      id="set-monthly-budget-limit-form"
      schema={monthlyBudgetLimitFormSchema}
      defaultValues={{
        month: summary.monthlyLimit?.month ?? currentMonthFirstDay(),
        limitMad: summary.monthlyLimit
          ? minorUnitsToMadInput(summary.monthlyLimit.limitMinor)
          : "",
        reason: "",
      }}
      onSubmit={handleSubmit}
      devTools={devFormTools(monthlyBudgetLimitFormSchema)}
      className="space-y-5"
    >
      <NFormSectionHeader icon={CalendarDays} title={t("operator.budgets.monthlyLimit")} />
      <div className="grid gap-4 md:grid-cols-2">
        <FormInput name="month" type="date" formLabel={t("operator.budgets.month")} icon="Calendar" required />
        <FormInput
          name="limitMad"
          type="text"
          formLabel={t("operator.budgets.limitMad")}
          placeholder={t("operator.budgets.limitPlaceholder")}
          icon="CircleDollarSign"
          required
        />
      </div>
      <FormInput
        name="reason"
        type="textarea"
        formLabel={t("operator.budgets.reason")}
        placeholder={t("operator.budgets.monthlyLimitReasonPlaceholder")}
        icon="MessageSquareText"
        required
      />
      <div className="flex justify-end pt-5">
        <NButton type="submit" disabled={setMonthlyLimit.isPending}>
          {setMonthlyLimit.isPending ? t("operator.budgets.saving") : t("operator.budgets.saveMonthlyLimit")}
        </NButton>
      </div>
    </NForm>
  );
}

export function ManualBudgetAdjustmentDialogContent({
  familyProfileId,
}: Readonly<{ familyProfileId: string }>) {
  const { t } = useKafilLanguage();
  const { pop } = useDialog();
  const { adjust } = useBudgetCommands();

  async function handleSubmit(values: ManualBudgetAdjustmentFormValues) {
    await adjust.mutateAsync({
      familyProfileId,
      input: toManualBudgetAdjustmentInput(values, crypto.randomUUID()),
    });
    await pop();
  }

  return (
    <NForm
      id="manual-budget-adjustment-form"
      schema={manualBudgetAdjustmentFormSchema}
      defaultValues={{ amountMad: "", reason: "" }}
      onSubmit={handleSubmit}
      devTools={devFormTools(manualBudgetAdjustmentFormSchema)}
      className="space-y-5"
    >
      <NFormSectionHeader icon={SlidersHorizontal} title={t("operator.budgets.manualAdjustment")} />
      <FormInput
        name="amountMad"
        type="text"
        formLabel={t("operator.budgets.adjustmentMad")}
        placeholder={t("operator.budgets.adjustmentPlaceholder")}
        icon="CircleDollarSign"
        required
      />
      <FormInput
        name="reason"
        type="textarea"
        formLabel={t("operator.budgets.reason")}
        placeholder={t("operator.budgets.adjustmentReasonPlaceholder")}
        icon="MessageSquareText"
        required
      />
      <div className="flex justify-end pt-5">
        <NButton type="submit" variant="destructive" disabled={adjust.isPending}>
          {adjust.isPending ? t("operator.budgets.recording") : t("operator.budgets.recordAdjustment")}
        </NButton>
      </div>
    </NForm>
  );
}
