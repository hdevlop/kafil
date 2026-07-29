export const FACTORY_SIDEBAR_LOGO_EXPANDED_PATH = "/logoExpanded.webp";
export const FACTORY_SIDEBAR_LOGO_COLLAPSED_PATH = "/logoExpanded.webp";
export const FACTORY_AUTH_HERO_IMAGE_PATH = "/HeroA.webp";

export const BRANDING_ASSET_ROUTE_PREFIX =
  "/api/branding/assets/serve/" as const;

const BRANDING_FILENAME_SOURCE =
  "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\\.(?:avif|gif|jpg|jpeg|png|webp)";

export const BRANDING_ASSET_FILENAME_PATTERN = new RegExp(
  `^${BRANDING_FILENAME_SOURCE}$`,
  "i",
);

export const BRANDING_ASSET_PATH_PATTERN = new RegExp(
  `^${BRANDING_ASSET_ROUTE_PREFIX}${BRANDING_FILENAME_SOURCE}$`,
  "i",
);

export const BRANDING_LOGO_MAX_BYTES = 2_000_000;
export const BRANDING_HERO_MAX_BYTES = 5_000_000;
