import { DEFAULT_BRANDING_REVISION } from "./settingSchema";
import type { PublicBranding } from "./brandingTypes";
import {
  FACTORY_AUTH_HERO_IMAGE_PATH,
  FACTORY_SIDEBAR_LOGO_COLLAPSED_PATH,
  FACTORY_SIDEBAR_LOGO_EXPANDED_PATH,
} from "./brandingConstants";

export function getFactoryBranding(
  revision: number = DEFAULT_BRANDING_REVISION,
): PublicBranding {
  return {
    sidebarLogoExpandedPath: FACTORY_SIDEBAR_LOGO_EXPANDED_PATH,
    sidebarLogoCollapsedPath: FACTORY_SIDEBAR_LOGO_COLLAPSED_PATH,
    authLogoPath: FACTORY_SIDEBAR_LOGO_EXPANDED_PATH,
    authHeroImagePath: FACTORY_AUTH_HERO_IMAGE_PATH,
    revision,
  };
}
