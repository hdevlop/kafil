import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

function readSource(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

describe("branding consumer integration", () => {
  test("sidebar branding reaches NSidebar through NBrandingProvider, not the shell", () => {
    // The mark is NSidebar's to render now: it reads appName and both logo
    // paths off najm-kit's branding context, which is the only thing that knows
    // its own resolved collapsed state.
    const provider = readSource("../src/providers/KafilBrandingProvider.tsx");
    expect(provider).toContain("NBrandingProvider");
    expect(provider).toContain("appName={APP_NAME}");
    expect(provider).toContain("logoExpanded={resolved.sidebarLogoExpandedPath}");
    expect(provider).toContain("logoCollapsed={resolved.sidebarLogoCollapsedPath}");

    // So the shell must not hand-roll the mark back in, nor mirror the
    // collapsed state itself the way it used to.
    const shell = readSource("../src/shared/DashboardShell/index.tsx");
    expect(shell).toContain("<NSidebar");
    expect(shell).not.toContain("BrandingImage");
    expect(shell).not.toContain("logo={");
    expect(shell).not.toContain("sidebarCollapsed");
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
    // Recovering from a broken src is NImage's job now; BrandingImage only has
    // to name the bundled asset it should land on.
    expect(image).toContain("<NImage");
    expect(image).toContain("fallback={fallback}");
    expect(image).toContain("sidebarLogoExpanded");
    expect(image).toContain("sidebarLogoCollapsed");
    expect(image).toContain("authLogo");
    expect(image).toContain("authHeroImage");
  });

  test("BrandAssetsPanel renders a single-column compact list with resilient ImageInput previews", () => {
    const panel = readSource(
      "../src/features/Settings/components/BrandAssetsPanel.tsx",
    );
    expect(panel).toContain("formatsSummary");
    expect(panel).toContain("<ImageInput");
    expect(panel).toContain("fallbackImage={resolved[definition.key]}");
    expect(panel).toContain("localFiles");
    expect(panel).toContain("unavailableContent");
    expect(panel).toContain("previewAlt={t(definition.titleKey)}");
    expect(panel).toContain('allowClear={false}');
    expect(panel).toContain("PREVIEW_CLASS");
    expect(panel).not.toContain("statusDefault");
    expect(panel).not.toContain("statusInherited");
    expect(panel).toContain("operator.settings.branding.replace");
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
