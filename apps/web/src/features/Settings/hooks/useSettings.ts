"use client";

import { useEntityCommand } from "@/hooks/useEntityCommand";
import { useEntityQuery } from "@/hooks/useEntityQuery";
import { entityKeys } from "@/hooks/queryKeys";
import { useKafilLanguage } from "@/i18n/useKafilLanguage";
import { getSettings, updateSettings } from "@/services/settingApi";

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
  const { t } = useKafilLanguage();
  return {
    updateSettings: useEntityCommand({
      mutationFn: updateSettings,
      invalidate: [settingKeys.all],
      successMessage: t("operator.settings.saveSuccess"),
      errorMessage: t("operator.settings.saveError"),
    }),
  };
}
