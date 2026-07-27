import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

function readSource(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

describe("branding consumer integration", () => {
  test("DashboardShell uses BrandingImage for both sidebar states and the factory fallbacks", () => {
    const shell = readSource("../src/shared/DashboardShell/index.tsx");
    expect(shell).toContain("useKafilBranding");
    expect(shell).toContain("sidebarCollapsed");
    expect(shell).toContain("onCollapsedChange={setSidebarCollapsed}");
    expect(shell).toContain("branding.sidebarLogoExpandedPath");
    expect(shell).toContain("branding.sidebarLogoCollapsedPath");
    expect(shell).toContain("slot=\"sidebarLogoExpanded\"");
    expect(shell).toContain("slot=\"sidebarLogoCollapsed\"");
    expect(shell).toContain("h-10 w-32 object-contain");
    expect(shell).toContain("size-full object-contain object-center");
    expect(shell).not.toContain("src=\"/logoExpanded.png\"");
  });

  test("AuthLayout uses BrandingImage for the logo and hero and resolves server-side branding", () => {
    const authLayout = readSource("../src/app/(auth)/layout.tsx");
    expect(authLayout).toContain("loadServerBranding");
    expect(authLayout).toContain("<BrandingImage");
    expect(authLayout).toContain('slot="authLogo"');
    expect(authLayout).toContain('slot="authHeroImage"');
    expect(authLayout).toContain("branding.authLogoPath");
    expect(authLayout).toContain("branding.authHeroImagePath");
    expect(authLayout).toContain('className="object-cover object-center"');
    expect(authLayout).not.toContain("src=\"/HeroA.png\"");
    expect(authLayout).not.toContain("src=\"/logoExpanded.png\"");
  });

  test("FirstLoginLayout uses BrandingImage and resolves server-side branding", () => {
    const firstLogin = readSource("../src/app/(first-login)/layout.tsx");
    expect(firstLogin).toContain("loadServerBranding");
    expect(firstLogin).toContain("<BrandingImage");
    expect(firstLogin).toContain('slot="authLogo"');
    expect(firstLogin).toContain("branding.authLogoPath");
    expect(firstLogin).not.toContain("src=\"/logoExpanded.png\"");
  });

  test("BrandingImage falls back to the bundled factory asset on image error", () => {
    const image = readSource("../src/features/Branding/BrandingImage.tsx");
    expect(image).toContain("FACTORY_FALLBACKS");
    expect(image).toContain("setErrorKey");
    expect(image).toContain("onError");
    expect(image).toContain("sidebarLogoExpanded");
    expect(image).toContain("sidebarLogoCollapsed");
    expect(image).toContain("authLogo");
    expect(image).toContain("authHeroImage");
  });

  test("BrandAssetsPanel renders a single-column compact list with direct image inputs and revert action", () => {
    const panel = readSource(
      "../src/features/Settings/components/BrandAssetsPanel.tsx",
    );
    expect(panel).toContain("formatsSummary");
    expect(panel).toContain("<ImageInput");
    expect(panel).toContain('imageSize="sm"');
    expect(panel).toContain('allowClear={false}');
    expect(panel).toContain("wide: { width: 126, height: 42 }");
    expect(panel).toContain("square: { width: 80, height: 80 }");
    expect(panel).toContain("panel: { width: 96, height: 112 }");
    expect(panel).toContain("previewStyle={IMAGE_PREVIEW_STYLE[definition.shape]}");
    expect(panel).toContain("[&_img]:object-contain");
    expect(panel).not.toContain("statusDefault");
    expect(panel).not.toContain("statusInherited");
    expect(panel).not.toContain("branding.replace");
    expect(panel).toContain("revertSlot");
    expect(panel).toContain("useDefault");
    expect(panel).toContain("useExpanded");
    expect(panel).toContain("className=\"flex items-center gap-3");
    expect(panel).toContain("divide-y divide-border");
  });

  test("KafilBrandingProvider tracks orphan candidates and surfaces a single formats summary", () => {
    const provider = readSource(
      "../src/providers/KafilBrandingProvider.tsx",
    );
    const reducer = readSource(
      "../src/providers/brandingReducer.ts",
    );
    expect(provider).toContain("mark_orphan_candidate");
    expect(provider).toContain("clear_orphan_candidates");
    expect(provider).toContain("cancelDraft");
    expect(provider).toContain("deleteBrandingCandidates");
    expect(reducer).toContain("revert_slot");
    expect(reducer).toContain("revert_all");
  });
});
