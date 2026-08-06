import { z } from "zod";

import { expectedAppearanceRevisionDto } from "./appearanceDto";
import { appearanceDesignConfigDto } from "./appearanceValidator";
import { MAX_THEME_PRESET_NAME_LENGTH } from "./themePresetSchema";

export const themePresetNameDto = z
  .string()
  .trim()
  .min(1)
  .max(MAX_THEME_PRESET_NAME_LENGTH);

export const themePresetIdParams = z.object({
  id: z.string().uuid(),
});

export const createThemePresetDto = z
  .object({
    name: themePresetNameDto,
    designConfig: appearanceDesignConfigDto,
  })
  .strict();

export const applyThemePresetDto = z
  .object({
    expectedRevision: expectedAppearanceRevisionDto,
  })
  .strict();

export type CreateThemePresetDto = z.input<typeof createThemePresetDto>;
export type ApplyThemePresetDto = z.input<typeof applyThemePresetDto>;
