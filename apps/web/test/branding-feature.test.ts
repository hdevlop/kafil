import {
  afterEach,
  beforeEach,
  describe,
  expect,
  spyOn,
  test,
} from "bun:test";
import { readFileSync } from "node:fs";

import { brandingKeys } from "../src/hooks/brandingKeys";
import {
  deleteBrandingAsset,
  deleteBrandingCandidates,
  getBranding,
  getBrandingConfig,
  resetBranding,
  updateBranding,
  uploadBrandingAsset,
} from "../src/services/brandingApi";
import { getFactoryBranding } from "@kafil/server/branding";
import { brandingResource, reportUiBootstrapDiagnostic } from "../src/lib/uiResources";
import {
  isBrandingDirty,
  isManagedUpload,
  orphansIn,
  pickSlots,
} from "../src/features/Settings/hooks/BrandingEditor";
import {
  BRANDING_SLOT_KEYS,
  type AdminBrandingConfig,
  type PublicBranding,
} from "../src/types/branding";

function readSource(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

function factoryBranding(
  revision: number = 1,
  customPaths: Partial<AdminBrandingConfig> = {},
): AdminBrandingConfig {
  const public_ = getFactoryBranding();
  return {
    sidebarLogoExpandedPath: customPaths.sidebarLogoExpandedPath ?? null,
    sidebarLogoCollapsedPath: customPaths.sidebarLogoCollapsedPath ?? null,
    authLogoPath: customPaths.authLogoPath ?? null,
    authHeroImagePath: customPaths.authHeroImagePath ?? null,
    resolved: { ...public_, revision },
    revision,
  };
}

function makeCustomPath(uuid: string, ext = "png") {
  return `/api/branding/assets/serve/${uuid}.${ext}`;
}

describe("branding factory", () => {
  test("returns independent factory projections that match the backend factory", () => {
    const first = getFactoryBranding();
    const second = getFactoryBranding();
    expect(first).toEqual(second);
    expect(first).not.toBe(second);
    expect(first.revision).toBe(1);
    expect(first.sidebarLogoExpandedPath).toBe("/logoExpanded.webp");
    expect(first.sidebarLogoCollapsedPath).toBe("/logoExpanded.webp");
    expect(first.authLogoPath).toBe("/logoExpanded.webp");
    expect(first.authHeroImagePath).toBe("/HeroA.webp");
  });
});

describe("branding query keys", () => {
  test("exposes the singleton current key and shared namespace", () => {
    expect(brandingKeys.current).toEqual(["branding", "detail", "current"]);
    expect(brandingKeys.all).toEqual(["branding"]);
  });
});

describe("branding api surface", () => {
  test("exposes the public and admin endpoints with their expected arity", () => {
    expect(getBranding.length).toBe(0);
    expect(getBrandingConfig.length).toBe(0);
    expect(updateBranding.length).toBe(1);
    expect(resetBranding.length).toBe(1);
    expect(uploadBrandingAsset.length).toBe(1);
    expect(deleteBrandingAsset.length).toBe(1);
    expect(deleteBrandingCandidates.length).toBe(1);
  });
});

describe("branding draft rules", () => {
  test("a draft starts from the customPath values, not the resolved paths", () => {
    const customExpanded = makeCustomPath("11111111-1111-4111-8111-111111111111");
    const initial = factoryBranding(2, { sidebarLogoExpandedPath: customExpanded });

    expect(pickSlots(initial)).toEqual({
      sidebarLogoExpandedPath: customExpanded,
      sidebarLogoCollapsedPath: null,
      authLogoPath: null,
      authHeroImagePath: null,
    });
  });

  test("only managed uploads are candidates for cleanup", () => {
    expect(isManagedUpload(makeCustomPath("22222222-2222-4222-8222-222222222222"))).toBe(true);
    expect(isManagedUpload("/logoExpanded.png")).toBe(false);
    expect(isManagedUpload(null)).toBe(false);
  });

  test("orphans are the uploads a draft points at that the committed config does not", () => {
    const committedPath = makeCustomPath("33333333-3333-4333-8333-333333333333");
    const newPath = makeCustomPath("44444444-4444-4444-8444-444444444444");
    const config = factoryBranding(1, { authLogoPath: committedPath });

    // Untouched: nothing to clean up.
    expect(orphansIn(pickSlots(config), config, [])).toEqual([]);

    const draft = { ...pickSlots(config), authLogoPath: newPath };
    expect(orphansIn(draft, config, [])).toEqual([newPath]);
    // Already tracked from the upload itself, so it is not listed twice.
    expect(orphansIn(draft, config, [newPath])).toEqual([newPath]);
  });

  test("a factory fallback path is never treated as an orphan", () => {
    const config = factoryBranding(1);
    const draft = { ...pickSlots(config), authLogoPath: "/logoExpanded.png" };

    expect(orphansIn(draft, config, [])).toEqual([]);
  });

  test("dirtiness compares the draft customPaths to the committed customPaths", () => {
    const originalPath = makeCustomPath("66666666-6666-4666-8666-666666666666");
    const newPath = makeCustomPath("77777777-7777-4777-8777-777777777777");
    const config = factoryBranding(1, { authLogoPath: originalPath });

    expect(isBrandingDirty(pickSlots(config), config)).toBe(false);
    expect(isBrandingDirty(null, config)).toBe(false);
    expect(isBrandingDirty(pickSlots(config), undefined)).toBe(false);
    expect(
      isBrandingDirty({ ...pickSlots(config), authLogoPath: newPath }, config),
    ).toBe(true);
  });
});

describe("branding resource", () => {
  let warning: ReturnType<typeof spyOn<typeof console, "warn">>;

  beforeEach(() => {
    warning = spyOn(console, "warn").mockImplementation(() => undefined);
  });

  afterEach(() => {
    warning.mockRestore();
  });

  test("is served from the public branding endpoint and falls back to the factory assets", () => {
    expect(brandingResource.path).toBe("/api/branding");
    expect(brandingResource.fallback()).toEqual(getFactoryBranding());
  });

  test("accepts a persisted branding payload", () => {
    const branding: PublicBranding = { ...getFactoryBranding(), revision: 7 };

    expect(brandingResource.parse(branding)).toEqual(branding);
    expect(warning).not.toHaveBeenCalled();
  });

  test("rejects a payload missing any of the four slots", () => {
    for (const slot of [
      "sidebarLogoExpandedPath",
      "sidebarLogoCollapsedPath",
      "authLogoPath",
      "authHeroImagePath",
    ] as const) {
      const incomplete = { ...getFactoryBranding(), revision: 4, [slot]: undefined };
      expect(brandingResource.parse(incomplete), `${slot} was accepted`).toBeUndefined();
    }
  });

  test("rejects a payload without a positive revision", () => {
    expect(brandingResource.parse({ ...getFactoryBranding(), revision: 0 })).toBeUndefined();
    expect(
      brandingResource.parse({ ...getFactoryBranding(), revision: undefined }),
    ).toBeUndefined();
  });

  test("drops everything but the four resolved paths and the revision", () => {
    const parsed = brandingResource.parse({
      ...getFactoryBranding(),
      revision: 9,
      // A wider admin response must not reach the public snapshot.
      draft: { authLogoPath: "/storage/secret.png" },
      expectedRevision: 8,
    });

    expect(Object.keys(parsed!).sort()).toEqual([
      "authHeroImagePath",
      "authLogoPath",
      "revision",
      "sidebarLogoCollapsedPath",
      "sidebarLogoExpandedPath",
    ]);
  });

  test("reports a fallback as a branding asset failure", () => {
    reportUiBootstrapDiagnostic({
      resource: "branding",
      reason: "invalid-payload",
      path: "/api/branding",
    });

    expect(warning).toHaveBeenCalled();
    expect(warning.mock.calls[0]![0]).toContain("factory assets");
  });

  /**
   * The admin config used to be loaded server-side and threaded through the
   * provider tree. Only the settings sheet ever needed it, so it is a client
   * query now (`useBrandingConfig`) and the server loader is gone — with it the
   * cookie-forwarding and public-projection cases that lived here.
   */
});

describe("branding UI fixes", () => {
  test("BrandAssetsPanel previews resolved assets through the fallback-aware ImageInput contract", () => {
    const panel = readSource(
      "../src/features/Settings/components/BrandAssetsPanel.tsx",
    );
    expect(panel).toContain("draftValue !== undefined && draftValue !== null");
    expect(panel).toContain("fallbackImage={resolved[definition.key]}");
    expect(panel).toContain("localFiles");
    expect(panel).toContain("unavailableContent");
    expect(panel).toContain("previewAlt={t(definition.titleKey)}");
  });

  test("AppSettingsPanel includes the upload count in the sheet's pending calculation", () => {
    const panel = readSource(
      "../src/features/Settings/components/AppSettingsPanel.tsx",
    );
    expect(panel).toMatch(/uploadingCount\s*>\s*0/);
  });

  test("the branding editor deletes superseded orphans after a successful commit", () => {
    const editor = readSource("../src/features/Settings/hooks/BrandingEditor.tsx");
    expect(editor).toContain("superseded");
    expect(editor).toContain("deleteBrandingCandidates");
  });
});

describe("branding provider wiring", () => {
  test("the branding editor is scoped to the settings sheet, not the app root", () => {
    const editor = readSource("../src/features/Settings/hooks/BrandingEditor.tsx");
    expect(editor).toContain('"use client"');
    expect(editor).toContain("useBrandingConfig");
    expect(editor).toContain("beginDraft");
    expect(editor).toContain("setSlot");
    expect(editor).toContain("clearSlot");
    expect(editor).toContain("revertSlot");
    expect(editor).toContain("revertAll");
    expect(editor).toContain("cancelDraft");
    expect(editor).toContain("commitDraft");

    // Mounted by the sheet that uses it. At the root it would be provider glue
    // again, loading an admin-only config for every visitor.
    const sheet = readSource(
      "../src/features/Settings/components/GlobalSettingsSheet.tsx",
    );
    expect(sheet).toContain("<BrandingEditorProvider");
    const appProviders = readSource("../src/providers/AppProviders.tsx");
    expect(appProviders).not.toContain("BrandingEditor");
  });

  test("AppProviders seeds the kit's branding and holds none of its own", () => {
    const appProviders = readSource("../src/providers/AppProviders.tsx");
    // The server payload goes over whole; the kit resolves the two sidebar
    // paths off it. A logo rename reappearing here is the adapter growing back.
    expect(appProviders).toContain("initialBranding={initialBranding}");
    expect(appProviders).not.toContain("logoExpanded");
    expect(appProviders).not.toContain("logoCollapsed");
    expect(appProviders).not.toContain("KafilBrandingProvider");
    expect(appProviders).not.toContain("KafilUIProvider");
  });

  test("root layout loads branding server-side with a factory fallback", () => {
    const layout = readSource("../src/app/layout.tsx");
    const resources = readSource("../src/lib/uiResources.ts");
    const serverLoader = readSource("../src/lib/serverLoader.ts");

    expect(layout).toContain("loadServerBranding");
    expect(layout).toContain("initialBranding={branding}");
    expect(layout).toContain('from "@/lib/serverLoader"');
    // The admin config is a client query now; the layout must not fetch it.
    expect(layout).not.toContain("loadServerBrandingConfig");
    expect(serverLoader).toContain("server.fetch");
    expect(resources).toContain("/api/branding");
    expect(resources).toContain("factory assets");
  });
});

describe("branding UI integration", () => {
  test("BrandAssetsPanel renders four compact rows with the resilient ImageInput contract", () => {
    const panel = readSource(
      "../src/features/Settings/components/BrandAssetsPanel.tsx",
    );
    const sheet = readSource(
      "../src/features/Settings/components/GlobalSettingsSheet.tsx",
    );
    const appPanel = readSource(
      "../src/features/Settings/components/AppSettingsPanel.tsx",
    );
    expect(panel).toContain("sidebarLogoExpanded");
    expect(panel).toContain("sidebarLogoCollapsed");
    expect(panel).toContain("authLogo");
    expect(panel).toContain("authHeroImage");
    expect(panel).toContain("uploadBrandingAsset");
    expect(panel).toContain("revertSlot");
    expect(panel).toContain("<ImageInput");
    expect(panel).toContain("fallbackImage={resolved[definition.key]}");
    expect(panel).toContain('allowClear={false}');
    expect(panel).toContain("localFiles");
    expect(panel).not.toContain("statusDefault");
    expect(panel).not.toContain("statusInherited");
    expect(panel).toContain("operator.settings.branding.replace");
    expect(panel).toContain("formatsSummary");
    expect(panel).not.toContain("discardDraft");
    expect(panel).not.toContain("remove");
    expect(appPanel).toContain('branding.isAdmin');
    expect(appPanel).toContain("<BrandAssetsPanel");
    expect(sheet).toContain("branding.cancelDraft");
    expect(sheet).toContain("branding.isDirty");
  });

  test("AppSettingsPanel combines form dirty state with branding draft state", () => {
    const appPanel = readSource(
      "../src/features/Settings/components/AppSettingsPanel.tsx",
    );
    expect(appPanel).toContain("branding.isDirty");
    expect(appPanel).toContain("branding.commitDraft()");
  });
});

describe("branding slot enumeration", () => {
  test("exposes the four documented slots in a stable order", () => {
    expect(BRANDING_SLOT_KEYS).toEqual([
      "sidebarLogoExpanded",
      "sidebarLogoCollapsed",
      "authLogo",
      "authHeroImage",
    ]);
  });
});
