"use client";

import { useEntityCommand } from "@/hooks/useEntityCommand";
import { useEntityQuery } from "@/hooks/useEntityQuery";
import {
  getFormFillSetting,
  getFundingSetting,
  updateFormFillSetting,
  updateFundingSetting,
} from "@/services/settingApi";

export const settingKeys = {
  all: ["settings"] as const,
  funding: ["settings", "funding"] as const,
  formFill: ["settings", "form-fill"] as const,
};

export function useFundingSetting() {
  return useEntityQuery({
    queryKey: settingKeys.funding,
    queryFn: getFundingSetting,
  });
}

export function useFormFillSetting() {
  return useEntityQuery({
    queryKey: settingKeys.formFill,
    queryFn: getFormFillSetting,
  });
}

export function useSettingCommands() {
  return {
    updateFunding: useEntityCommand({
      mutationFn: updateFundingSetting,
      invalidate: [settingKeys.all],
      successMessage: "Default family funding target updated.",
      errorMessage: "Could not update the default family funding target.",
    }),
    updateFormFill: useEntityCommand({
      mutationFn: updateFormFillSetting,
      invalidate: [settingKeys.all],
      successMessage: "F8 form fill setting updated.",
      errorMessage: "Could not update the F8 form fill setting.",
    }),
  };
}
