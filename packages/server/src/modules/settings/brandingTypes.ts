export type BrandingSlot =
  | "sidebarLogoExpanded"
  | "sidebarLogoCollapsed"
  | "authLogo"
  | "authHeroImage";

export const BRANDING_SLOTS = [
  "sidebarLogoExpanded",
  "sidebarLogoCollapsed",
  "authLogo",
  "authHeroImage",
] as const satisfies readonly BrandingSlot[];

export interface StoredBranding {
  sidebarLogoExpandedPath: string | null;
  sidebarLogoCollapsedPath: string | null;
  authLogoPath: string | null;
  authHeroImagePath: string | null;
  brandingRevision: number;
}

export interface PublicBranding {
  sidebarLogoExpandedPath: string;
  sidebarLogoCollapsedPath: string;
  authLogoPath: string;
  authHeroImagePath: string;
  revision: number;
}

export interface BrandingAssetReferences {
  sidebarLogoExpandedPath: string | null;
  sidebarLogoCollapsedPath: string | null;
  authLogoPath: string | null;
  authHeroImagePath: string | null;
}

export interface AdminBrandingConfig {
  sidebarLogoExpandedPath: string | null;
  sidebarLogoCollapsedPath: string | null;
  authLogoPath: string | null;
  authHeroImagePath: string | null;
  resolved: PublicBranding;
  revision: number;
}
