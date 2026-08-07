import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

function readSource(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

describe("branding consumer integration", () => {
  test("sidebar branding reaches NSidebar through NBrandingProvider, not the shell", () => {
    // The mark is NSidebar's to render: it reads appName and both logo paths
    // off najm-kit's branding context, the only thing that knows its own
    // resolved collapsed state. The kit holds them as state now, so Kafil only
    // seeds it — what this pins is that the server-resolved paths still get in.
    const provider = readSource("../src/providers/AppProviders.tsx");
    expect(provider).toContain("NajmAppProvider");
    expect(provider).toContain("appName={APP_NAME}");
    // Handed over whole. The kit reads the sidebar paths off the payload, so a
    // rename here would be Kafil growing an adapter back.
    expect(provider).toContain("initialBranding={initialBranding}");
    expect(provider).not.toContain("sidebarLogoExpandedPath");
    expect(provider).not.toContain("sidebarLogoCollapsedPath");

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

  test("the branding editor tracks orphan candidates and pushes committed logos at the kit", () => {
    const editor = readSource("../src/features/Settings/hooks/BrandingEditor.tsx");

    expect(editor).toContain("orphansIn");
    expect(editor).toContain("cancelDraft");
    expect(editor).toContain("deleteBrandingCandidates");
    expect(editor).toContain("revertSlot");
    expect(editor).toContain("revertAll");
    // A commit has to reach the sidebar without a reload, which is the whole
    // reason the kit's branding is state and not a prop.
    expect(editor).toContain("useNBrandingEditor");
    // The save response goes straight back to the kit — `setBranding` takes the
    // payload shape, so there is no second copy of the logo rename here.
    expect(editor).toContain("kit?.setBranding(updated)");
  });
});
