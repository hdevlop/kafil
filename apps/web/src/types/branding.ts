export type BrandingSlot =
  | "sidebarLogoExpanded"
  | "sidebarLogoCollapsed"
  | "authLogo"
  | "authHeroImage";

export const BRANDING_SLOT_KEYS = [
  "sidebarLogoExpanded",
  "sidebarLogoCollapsed",
  "authLogo",
  "authHeroImage",
] as const satisfies readonly BrandingSlot[];

export interface PublicBranding {
  sidebarLogoExpandedPath: string;
  sidebarLogoCollapsedPath: string;
  authLogoPath: string;
  authHeroImagePath: string;
  revision: number;
}

export interface AdminBrandingConfig {
  sidebarLogoExpandedPath: string | null;
  sidebarLogoCollapsedPath: string | null;
  authLogoPath: string | null;
  authHeroImagePath: string | null;
  resolved: PublicBranding;
  revision: number;
}

export type BrandingCustomPaths = Pick<
  AdminBrandingConfig,
  | "sidebarLogoExpandedPath"
  | "sidebarLogoCollapsedPath"
  | "authLogoPath"
  | "authHeroImagePath"
>;

export interface BrandingDraft {
  sidebarLogoExpandedPath: string | null;
  sidebarLogoCollapsedPath: string | null;
  authLogoPath: string | null;
  authHeroImagePath: string | null;
}

export interface UpdateBrandingInput {
  sidebarLogoExpandedPath: string | null;
  sidebarLogoCollapsedPath: string | null;
  authLogoPath: string | null;
  authHeroImagePath: string | null;
  expectedRevision: number;
}

export interface ResetBrandingInput {
  expectedRevision: number;
}

export interface UploadBrandingAssetResult {
  path: string;
}

export const BRANDING_LOGO_MAX_BYTES = 2_000_000;
export const BRANDING_HERO_MAX_BYTES = 5_000_000;

export const BRANDING_LOGO_ACCEPT =
  "image/png,image/jpeg,image/webp,image/avif";
export const BRANDING_HERO_ACCEPT = BRANDING_LOGO_ACCEPT;

export const BRANDING_ASSET_ROUTE_PREFIX = "/api/branding/assets/serve/";
