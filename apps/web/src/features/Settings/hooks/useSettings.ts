"use client";

import { useEntityCommand, useEntityQuery } from "najm-kit/query";
import { entityKeys } from "najm-kit/query/keys";
import { useTranslation } from "najm-i18n/react";
import { getSettings, updateSettings } from "@/services/settingApi";
import { budgetKeys } from "@/features/Budgets/hooks/budgetKeys";
import { familyBudgetKeys } from "@/features/Budgets/hooks/familyBudgetKeys";

export const settingKeys = {
  all: entityKeys.all("settings"),
};

export function usePlatformSettings() {
  return useEntityQuery({
    queryKey: settingKeys.all,
    queryFn: getSettings,
  });
}

export function useSettingCommands() {
  const { t } = useTranslation();
  return {
    updateSettings: useEntityCommand({
      mutationFn: updateSettings,
      invalidate: [settingKeys.all, budgetKeys.all, familyBudgetKeys.all],
      successMessage: t("operator.settings.saveSuccess"),
      errorMessage: t("operator.settings.saveError"),
    }),
  };
}
