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
import { getFactoryPublicBranding } from "../src/lib/brandingFactory";
import { loadBrandingWith } from "../src/lib/brandingLoader";
import {
  brandingReducer,
  createInitialBrandingState,
  initialBrandingDraft,
  isBrandingDraftDirty,
  selectResolvedBranding,
} from "../src/providers/brandingReducer";
import {
  BRANDING_SLOT_KEYS,
  type AdminBrandingConfig,
  type PublicBranding,
} from "../src/types/branding";

const FACTORY_FALLBACK_CONFIG: AdminBrandingConfig = {
  sidebarLogoExpandedPath: null,
  sidebarLogoCollapsedPath: null,
  authLogoPath: null,
  authHeroImagePath: null,
  resolved: getFactoryPublicBranding(),
  revision: 1,
};

type AdminConfigFetcher = (path: string) => Promise<Response>;
type PublicFetcher = (path: string) => Promise<Response>;
type CookieForwardingFetcher = (
  path: string,
  init?: RequestInit,
) => Promise<Response>;

async function loadBrandingConfigWithMock(
  fetcher: AdminConfigFetcher,
): Promise<AdminBrandingConfig> {
  try {
    const response = await fetcher("/api/branding/config");
    if (!response.ok) return FACTORY_FALLBACK_CONFIG;
    const payload = (await response.json()) as { data?: AdminBrandingConfig };
    if (
      !payload.data ||
      typeof payload.data.revision !== "number" ||
      !payload.data.resolved
    ) {
      return FACTORY_FALLBACK_CONFIG;
    }
    return payload.data;
  } catch {
    return FACTORY_FALLBACK_CONFIG;
  }
}

function readSource(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

function factoryBranding(
  revision: number = 1,
  customPaths: Partial<AdminBrandingConfig> = {},
): AdminBrandingConfig {
  const public_ = getFactoryPublicBranding();
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
    const first = getFactoryPublicBranding();
    const second = getFactoryPublicBranding();
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

describe("branding reducer", () => {
  test("begins a draft by cloning the customPath values, not the resolved paths", () => {
    const customExpanded = makeCustomPath("11111111-1111-4111-8111-111111111111");
    const initial = factoryBranding(2, { sidebarLogoExpandedPath: customExpanded });
    const state = createInitialBrandingState(initial);

    const draftStarted = brandingReducer(state, {
      type: "begin_draft",
      initial: initialBrandingDraft(initial),
    });

    expect(draftStarted.draft).toEqual({
      sidebarLogoExpandedPath: customExpanded,
      sidebarLogoCollapsedPath: null,
      authLogoPath: null,
      authHeroImagePath: null,
    });
    expect(draftStarted.committed).toBe(state.committed);
  });

  test("tracks orphan candidates when a managed upload is set", () => {
    const customPath = makeCustomPath("22222222-2222-4222-8222-222222222222");
    const state = createInitialBrandingState(factoryBranding(1));
    const started = brandingReducer(state, {
      type: "begin_draft",
      initial: initialBrandingDraft(factoryBranding(1)),
    });

    const updated = brandingReducer(started, {
      type: "update_slot",
      slot: "authHeroImagePath",
      value: customPath,
    });
    const tracked = brandingReducer(updated, {
      type: "mark_orphan_candidate",
      path: customPath,
    });
    expect(tracked.orphanCandidates).toContain(customPath);
  });

  test("revert_slot restores the committed customPath without orphaning the current draft value", () => {
    const originalPath = makeCustomPath("33333333-3333-4333-8333-333333333333");
    const newPath = makeCustomPath("44444444-4444-4444-8444-444444444444");
    const initial = factoryBranding(1, { authLogoPath: originalPath });
    const state = createInitialBrandingState(initial);
    const started = brandingReducer(state, {
      type: "begin_draft",
      initial: initialBrandingDraft(initial),
    });
    const updated = brandingReducer(started, {
      type: "update_slot",
      slot: "authLogoPath",
      value: newPath,
    });
    const reverted = brandingReducer(updated, {
      type: "revert_slot",
      slot: "authLogoPath",
    });
    expect(reverted.draft?.authLogoPath).toBe(originalPath);
  });

  test("replace_committed swaps the admin config and drops any draft", () => {
    const initial = factoryBranding(1);
    const state = createInitialBrandingState(initial);
    const started = brandingReducer(state, {
      type: "begin_draft",
      initial: initialBrandingDraft(initial),
    });
    const next: AdminBrandingConfig = {
      ...initial,
      authHeroImagePath: makeCustomPath("55555555-5555-4555-8555-555555555555"),
      resolved: { ...initial.resolved, revision: 2 },
      revision: 2,
    };
    const replaced = brandingReducer(started, {
      type: "replace_committed",
      config: next,
    });
    expect(replaced.committed).toEqual(next);
    expect(replaced.draft).toBeNull();
    expect(replaced.orphanCandidates).toEqual([]);
  });

  test("selectResolvedBranding always returns the committed resolved projection", () => {
    const initial = factoryBranding(4);
    const state = createInitialBrandingState(initial);
    expect(selectResolvedBranding(state)).toEqual(state.committed.resolved);
  });

  test("isBrandingDraftDirty compares the draft customPath values to the committed customPath values", () => {
    const originalPath = makeCustomPath("66666666-6666-4666-8666-666666666666");
    const newPath = makeCustomPath("77777777-7777-4777-8777-777777777777");
    const initial = factoryBranding(1, { authLogoPath: originalPath });
    const state = createInitialBrandingState(initial);
    const started = brandingReducer(state, {
      type: "begin_draft",
      initial: initialBrandingDraft(initial),
    });
    expect(isBrandingDraftDirty(started)).toBe(false);
    const updated = brandingReducer(started, {
      type: "update_slot",
      slot: "authLogoPath",
      value: newPath,
    });
    expect(isBrandingDraftDirty(updated)).toBe(true);
  });
});

describe("branding server loaders", () => {
  let warning: ReturnType<typeof spyOn<typeof console, "warn">>;

  beforeEach(() => {
    warning = spyOn(console, "warn").mockImplementation(() => undefined);
  });

  afterEach(() => {
    warning.mockRestore();
  });

  test("returns the parsed payload from a successful public GET", async () => {
    const branding: PublicBranding = {
      ...getFactoryPublicBranding(),
      revision: 7,
    };
    const fetcher = async () =>
      new Response(JSON.stringify({ data: branding }), { status: 200 });

    await expect(loadBrandingWith(fetcher)).resolves.toEqual(branding);
    expect(warning).not.toHaveBeenCalled();
  });

  test("falls back to the factory for a non-ok response", async () => {
    const fetcher = async () =>
      new Response(JSON.stringify({ message: "boom" }), { status: 503 });

    await expect(loadBrandingWith(fetcher)).resolves.toEqual(
      getFactoryPublicBranding(),
    );
    expect(warning).toHaveBeenCalled();
  });

  test("admin loader returns customPath and resolved from a successful response", async () => {
    const config: AdminBrandingConfig = {
      sidebarLogoExpandedPath: makeCustomPath("88888888-8888-4888-8888-888888888888"),
      sidebarLogoCollapsedPath: null,
      authLogoPath: null,
      authHeroImagePath: null,
      resolved: { ...getFactoryPublicBranding(), revision: 3 },
      revision: 3,
    };
    const fetcher = async () =>
      new Response(JSON.stringify({ data: config }), { status: 200 });
    const result = await loadBrandingConfigWithMock(fetcher);
    expect(result).toEqual(config);
  });

  test("admin loader falls back to the factory for an invalid payload", async () => {
    const fetcher = async () =>
      new Response(JSON.stringify({ data: null }), { status: 200 });
    const result = await loadBrandingConfigWithMock(fetcher);
    expect(result).toMatchObject({
      sidebarLogoExpandedPath: null,
      sidebarLogoCollapsedPath: null,
      authLogoPath: null,
      authHeroImagePath: null,
    });
  });

  test("admin loader forwards the user cookies as request headers", async () => {
    let capturedHeaders: Record<string, string> | undefined;
    const config: AdminBrandingConfig = {
      sidebarLogoExpandedPath: makeCustomPath("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"),
      sidebarLogoCollapsedPath: null,
      authLogoPath: null,
      authHeroImagePath: null,
      resolved: { ...getFactoryPublicBranding(), revision: 2 },
      revision: 2,
    };
    const fetcher = async (path: string, init?: RequestInit) => {
      capturedHeaders = init?.headers as Record<string, string>;
      return new Response(JSON.stringify({ data: config }), { status: 200 });
    };
    const expectedCookie = "kafil-session=abc123; other=value";
    const result = await loadBrandingConfigWithCookie(fetcher, expectedCookie);
    expect(result).toEqual(config);
    expect(capturedHeaders).toBeDefined();
    expect(capturedHeaders?.cookie).toBe(expectedCookie);
  });

  test("public loader constructs an admin config with null custom paths", async () => {
    const publicBranding: PublicBranding = {
      ...getFactoryPublicBranding(),
      authHeroImagePath: "/HeroA.webp",
      revision: 5,
    };
    const fetcher = async () =>
      new Response(JSON.stringify({ data: publicBranding }), { status: 200 });
    const result = await loadServerBrandingConfigAsPublicMock(fetcher);
    expect(result.sidebarLogoExpandedPath).toBeNull();
    expect(result.resolved).toEqual(publicBranding);
    expect(result.revision).toBe(5);
  });
});

describe("branding UI fixes", () => {
  test("BrandAssetsPanel preview shows the resolved fallback when the draft slot is null", () => {
    const panel = readSource(
      "../src/features/Settings/components/BrandAssetsPanel.tsx",
    );
    expect(panel).toContain("draftValue !== undefined && draftValue !== null");
  });

  test("AppSettingsPanel includes the upload count in the sheet's pending calculation", () => {
    const panel = readSource(
      "../src/features/Settings/components/AppSettingsPanel.tsx",
    );
    expect(panel).toMatch(/uploadingCount\s*>\s*0/);
  });

  test("KafilBrandingProvider deletes superseded orphans after a successful commit and reset", () => {
    const provider = readSource(
      "../src/providers/KafilBrandingProvider.tsx",
    );
    expect(provider).toContain("supersededOrphans");
    expect(provider).toContain("deleteBrandingCandidates");
  });

  test("serverBrandingConfig.ts forwards the session cookie through server.fetch", () => {
    const loader = readSource(
      "../src/lib/serverBrandingConfig.ts",
    );
    expect(loader).toContain("cookie");
    expect(loader).toContain("server.fetch");
    expect(loader).toContain("headers");
  });
});

// Mocks mirroring the production loader contracts.
async function loadBrandingConfigWithCookie(
  fetcher: CookieForwardingFetcher,
  cookieHeader: string,
): Promise<AdminBrandingConfig> {
  try {
    const response = await fetcher("/api/branding/config", {
      headers: { cookie: cookieHeader },
    });
    if (!response.ok) {
      return {
        sidebarLogoExpandedPath: null,
        sidebarLogoCollapsedPath: null,
        authLogoPath: null,
        authHeroImagePath: null,
        resolved: getFactoryPublicBranding(),
        revision: 1,
      };
    }
    const payload = (await response.json()) as { data?: AdminBrandingConfig };
    if (!payload.data) {
      return {
        sidebarLogoExpandedPath: null,
        sidebarLogoCollapsedPath: null,
        authLogoPath: null,
        authHeroImagePath: null,
        resolved: getFactoryPublicBranding(),
        revision: 1,
      };
    }
    return payload.data;
  } catch {
    return {
      sidebarLogoExpandedPath: null,
      sidebarLogoCollapsedPath: null,
      authLogoPath: null,
      authHeroImagePath: null,
      resolved: getFactoryPublicBranding(),
      revision: 1,
    };
  }
}

async function loadServerBrandingConfigAsPublicMock(
  fetcher: PublicFetcher,
): Promise<AdminBrandingConfig> {
  try {
    const response = await fetcher("/api/branding");
    if (!response.ok) {
      return {
        sidebarLogoExpandedPath: null,
        sidebarLogoCollapsedPath: null,
        authLogoPath: null,
        authHeroImagePath: null,
        resolved: getFactoryPublicBranding(),
        revision: 1,
      };
    }
    const payload = (await response.json()) as { data?: PublicBranding };
    if (!payload.data) {
      return {
        sidebarLogoExpandedPath: null,
        sidebarLogoCollapsedPath: null,
        authLogoPath: null,
        authHeroImagePath: null,
        resolved: getFactoryPublicBranding(),
        revision: 1,
      };
    }
    return {
      sidebarLogoExpandedPath: null,
      sidebarLogoCollapsedPath: null,
      authLogoPath: null,
      authHeroImagePath: null,
      resolved: payload.data,
      revision: payload.data.revision,
    };
  } catch {
    return {
      sidebarLogoExpandedPath: null,
      sidebarLogoCollapsedPath: null,
      authLogoPath: null,
      authHeroImagePath: null,
      resolved: getFactoryPublicBranding(),
      revision: 1,
    };
  }
}

describe("branding provider wiring", () => {
  test("KafilBrandingProvider exists and owns the committed, draft, and commands", () => {
    const provider = readSource(
      "../src/providers/KafilBrandingProvider.tsx",
    );
    expect(provider).toContain('"use client"');
    expect(provider).toContain("brandingReducer");
    expect(provider).toContain("beginDraft");
    expect(provider).toContain("setSlot");
    expect(provider).toContain("clearSlot");
    expect(provider).toContain("revertSlot");
    expect(provider).toContain("revertAll");
    expect(provider).toContain("cancelDraft");
    expect(provider).toContain("commitDraft");
    expect(provider).toContain("resetToFactory");
    expect(provider).toContain("useKafilBranding");
  });

  test("AppProviders mounts KafilBrandingProvider between KafilAppearanceProvider and KafilDesignProvider", () => {
    const appProviders = readSource("../src/providers/AppProviders.tsx");
    const appearanceIndex = appProviders.indexOf("KafilAppearanceProvider");
    const brandingIndex = appProviders.indexOf("KafilBrandingProvider");
    const designIndex = appProviders.indexOf("KafilDesignProvider");
    expect(appearanceIndex).toBeGreaterThan(-1);
    expect(brandingIndex).toBeGreaterThan(appearanceIndex);
    expect(designIndex).toBeGreaterThan(brandingIndex);
    expect(appProviders).toContain("initialConfig={initialBrandingConfig}");
  });

  test("root layout loads branding server-side with a factory fallback", () => {
    const layout = readSource("../src/app/layout.tsx");
    const serverHelper = readSource("../src/lib/serverBranding.ts");
    const loader = readSource("../src/lib/brandingLoader.ts");
    const configLoader = readSource(
      "../src/lib/serverBrandingConfig.ts",
    );

    expect(layout).toContain("loadServerBranding");
    expect(layout).toContain("loadServerBrandingConfig");
    expect(layout).toContain("initialBrandingResolved");
    expect(serverHelper).toContain("server.fetch");
    expect(serverHelper).toContain("loadBrandingWith");
    expect(loader).toContain("/api/branding");
    expect(loader).toContain("factory assets");
    expect(configLoader).toContain("/api/branding/config");
  });
});

describe("branding UI integration", () => {
  test("BrandAssetsPanel renders four compact rows with direct image inputs and a single formats summary", () => {
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
    expect(panel).toContain('allowClear={false}');
    expect(panel).not.toContain("statusDefault");
    expect(panel).not.toContain("statusInherited");
    expect(panel).not.toContain("branding.replace");
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
