"use client";

import { useEntityCommand } from "@/hooks/useEntityCommand";
import { useEntityQuery } from "@/hooks/useEntityQuery";
import {
  getAppearance,
  resetAppearance,
  updateAppearance,
} from "@/services/appearanceApi";
import type {
  PublicAppearance,
  ResetAppearanceInput,
  UpdateAppearanceInput,
} from "@/types/appearance";

import { appearanceKeys } from "./appearanceKeys";

export function usePublicAppearance(enabled = true) {
  return useEntityQuery<PublicAppearance>({
    queryKey: appearanceKeys.current,
    queryFn: getAppearance,
    enabled,
    staleTime: 60_000,
  });
}

export function useAppearanceCommands() {
  return {
    updateAppearance: useEntityCommand<PublicAppearance, UpdateAppearanceInput>({
      mutationFn: updateAppearance,
      invalidate: [appearanceKeys.all],
    }),
    resetAppearance: useEntityCommand<PublicAppearance, ResetAppearanceInput>({
      mutationFn: resetAppearance,
      invalidate: [appearanceKeys.all],
    }),
  };
}
