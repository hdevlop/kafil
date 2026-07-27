import { z } from "zod";

import {
  BRANDING_ASSET_PATH_PATTERN,
  FACTORY_AUTH_HERO_IMAGE_PATH,
  FACTORY_SIDEBAR_LOGO_COLLAPSED_PATH,
  FACTORY_SIDEBAR_LOGO_EXPANDED_PATH,
} from "./brandingConstants";
import { MAX_APPEARANCE_REVISION } from "./appearanceDto";

export const MAX_BRANDING_REVISION = MAX_APPEARANCE_REVISION;

export const expectedBrandingRevisionDto = z
  .number()
  .int()
  .positive()
  .max(MAX_BRANDING_REVISION);

const brandingAssetPathDto = z
  .string()
  .trim()
  .min(1)
  .max(512)
  .refine(
    (value) => BRANDING_ASSET_PATH_PATTERN.test(value),
    "Branding asset must reference a managed branding upload",
  );

const optionalBrandingAssetPathDto = brandingAssetPathDto
  .nullable()
  .optional();

export const updateBrandingDto = z
  .object({
    sidebarLogoExpandedPath: optionalBrandingAssetPathDto,
    sidebarLogoCollapsedPath: optionalBrandingAssetPathDto,
    authLogoPath: optionalBrandingAssetPathDto,
    authHeroImagePath: optionalBrandingAssetPathDto,
    expectedRevision: expectedBrandingRevisionDto,
  })
  .strict()
  .transform((value) => ({
    sidebarLogoExpandedPath: value.sidebarLogoExpandedPath ?? null,
    sidebarLogoCollapsedPath: value.sidebarLogoCollapsedPath ?? null,
    authLogoPath: value.authLogoPath ?? null,
    authHeroImagePath: value.authHeroImagePath ?? null,
    expectedRevision: value.expectedRevision,
  }));

export const resetBrandingDto = z
  .object({
    expectedRevision: expectedBrandingRevisionDto,
  })
  .strict();

export type UpdateBrandingDto = z.input<typeof updateBrandingDto>;
export type ResetBrandingDto = z.input<typeof resetBrandingDto>;

export { FACTORY_SIDEBAR_LOGO_EXPANDED_PATH, FACTORY_SIDEBAR_LOGO_COLLAPSED_PATH, FACTORY_AUTH_HERO_IMAGE_PATH };
