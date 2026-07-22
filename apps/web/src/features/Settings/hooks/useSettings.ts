"use client";

import { useEntityCommand } from "@/hooks/useEntityCommand";
import { useEntityQuery } from "@/hooks/useEntityQuery";
import {
  getFundingSetting,
  updateFundingSetting,
} from "@/services/settingApi";

export const settingKeys = {
  all: ["settings"] as const,
  funding: ["settings", "funding"] as const,
};

export function useFundingSetting() {
  return useEntityQuery({
    queryKey: settingKeys.funding,
    queryFn: getFundingSetting,
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
  };
}
