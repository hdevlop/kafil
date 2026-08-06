"use client";

import { useEntityCommand } from "@/hooks/useEntityCommand";
import { useEntityQuery } from "@/hooks/useEntityQuery";
import { appearanceKeys } from "@/hooks/appearanceKeys";
import {
  applyThemePreset,
  createThemePreset,
  deleteThemePreset,
  listThemePresets,
} from "@/services/themePresetApi";
import type { PublicAppearance } from "@/types/appearance";
import type {
  ApplyThemePresetInput,
  CreateThemePresetInput,
  ThemePreset,
} from "@/types/themePreset";

import { themePresetKeys } from "./themePresetKeys";

export function useThemePresets(enabled: boolean) {
  return useEntityQuery<ThemePreset[]>({
    queryKey: themePresetKeys.list,
    queryFn: listThemePresets,
    enabled,
    staleTime: 60_000,
  });
}

export function useThemePresetCommands() {
  return {
    createPreset: useEntityCommand<ThemePreset, CreateThemePresetInput>({
      mutationFn: createThemePreset,
      invalidate: [themePresetKeys.all],
    }),
    // Applying a preset rewrites the platform appearance, so both caches move.
    applyPreset: useEntityCommand<PublicAppearance, ApplyThemePresetInput>({
      mutationFn: applyThemePreset,
      invalidate: [themePresetKeys.all, appearanceKeys.all],
    }),
    deletePreset: useEntityCommand<ThemePreset, string>({
      mutationFn: deleteThemePreset,
      invalidate: [themePresetKeys.all],
    }),
  };
}
