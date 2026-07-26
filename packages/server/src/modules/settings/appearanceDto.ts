import { z } from "zod";

import { appearanceDesignConfigDto } from "./appearanceValidator";

export const MAX_APPEARANCE_REVISION = 2_147_483_646;

export const expectedAppearanceRevisionDto = z
  .number()
  .int()
  .positive()
  .max(MAX_APPEARANCE_REVISION);

export const updateAppearanceDto = z
  .object({
    designConfig: appearanceDesignConfigDto,
    expectedRevision: expectedAppearanceRevisionDto,
  })
  .strict();

export const resetAppearanceDto = z
  .object({
    expectedRevision: expectedAppearanceRevisionDto,
  })
  .strict();

export type UpdateAppearanceDto = z.input<typeof updateAppearanceDto>;
export type ResetAppearanceDto = z.input<typeof resetAppearanceDto>;
