import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  canOpenGlobalSettings,
  getGlobalSettingsTabs,
} from "../src/features/Settings/components/GlobalSettingsSheet";

function readSource(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

function walk(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full = join(directory, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

const SRC = fileURLToPath(new URL("../src/", import.meta.url));

/**
 * Kafil's half of the `najm-theme` adoption.
 *
 * What is *not* here on purpose: revision conflicts, slot resolution, upload
 * validation, candidate cleanup, preset slugs, draft state, and the localized
 * strings around them. Those are the package's contract and the package's
 * tests. Re-asserting them here would be the duplication this move removed,
 * one layer up.
 */
describe("najm-theme adoption — Kafil boundary", () => {
  test("no local appearance, branding, or preset implementation survives", () => {
    const forbidden = [
      "services/appearanceApi.ts",
      "services/brandingApi.ts",
      "services/themePresetApi.ts",
      "hooks/appearanceKeys.ts",
      "hooks/brandingKeys.ts",
      "hooks/themePresetKeys.ts",
      "hooks/useAppearance.ts",
      "hooks/useBranding.ts",
      "hooks/useThemePresets.ts",
      "types/appearance.ts",
      "types/themePreset.ts",
      "lib/uiResources.ts",
      "lib/themeResources.ts",
      "features/Settings/hooks/BrandingEditor.tsx",
      "features/Settings/hooks/useAppearanceEditor.ts",
      "features/Settings/components/BrandAssetsPanel.tsx",
      "features/Settings/components/ThemePresetsPanel.tsx",
      "features/Settings/components/ThemeSettingsPanel.tsx",
    ];

    const present = forbidden.filter((path) => {
      try {
        readSource(`../src/${path}`);
        return true;
      } catch {
        return false;
      }
    });
    expect(present).toEqual([]);
  });

  test("nothing outside the package reimplements its transport or keys", () => {
    const offenders = walk(SRC)
      .filter((path) => /\.tsx?$/.test(path))
      .filter((path) => {
        const content = readFileSync(path, "utf8");
        return (
          content.includes("/theme-presets") ||
          content.includes("/branding/assets/serve/") ||
          content.includes("expectedRevision")
        );
      })
      .map((path) => path.slice(SRC.length));

    expect(offenders).toEqual([]);
  });

  test("the settings sheet composes package sections and the package action bar", () => {
    const sheet = readSource(
      "../src/features/Settings/components/GlobalSettingsSheet.tsx",
    );

    expect(sheet).toContain('from "najm-theme/react"');
    expect(sheet).toContain("<NThemeSettingsProvider");
    expect(sheet).toContain("<NThemeAppearanceSettings");
    expect(sheet).toContain("<NThemeBrandingSettings");
    expect(sheet).toContain("<NThemePresetSettings");
    expect(sheet).toContain("<NThemeSettingsActions");

    // Kafil mounts the plugin at its server base, so the client's base URL is
    // `/api`, not `/api/theme`.
    expect(sheet).toContain('baseUrl: "/api"');
    // Kafil authenticates with a bearer token, not a cookie. Without the header
    // provider every administrative theme request is anonymous and 401s — and
    // it must stay a function so a rotated token is read at call time.
    expect(sheet).toContain("headers: authorizationHeaders");

    // Kafil's own app tab keeps its own form and its own submit.
    expect(sheet).toContain("APP_SETTINGS_FORM_ID");
    expect(sheet).toContain("<AppSettingsPanel");
  });

  test("only an administrator mounts the provider, and the tab set is unchanged", () => {
    expect(canOpenGlobalSettings("admin")).toBe(true);
    expect(canOpenGlobalSettings("operator")).toBe(true);
    expect(canOpenGlobalSettings("family")).toBe(false);
    expect(canOpenGlobalSettings("sponsor")).toBe(false);
    expect(getGlobalSettingsTabs("admin")).toEqual(["theme", "app"]);
    expect(getGlobalSettingsTabs("operator")).toEqual(["app"]);
    expect(getGlobalSettingsTabs("family")).toEqual([]);

    const sheet = readSource(
      "../src/features/Settings/components/GlobalSettingsSheet.tsx",
    );
    expect(sheet).toContain('if (props.role !== "admin") return <GlobalSettings {...props} />;');
  });

  test("the app settings panel no longer saves branding", () => {
    const panel = readSource(
      "../src/features/Settings/components/AppSettingsPanel.tsx",
    );

    expect(panel).toContain("useSettingCommands");
    expect(panel).toContain("settingsFormSchema");
    // No branding import, no branding editor call, no branding section. The
    // coupling that made one Kafil form responsible for an asset lifecycle.
    expect(panel).not.toContain("useBrandingEditor");
    expect(panel).not.toContain("BrandAssetsPanel");
    expect(panel).not.toContain("commitDraft");
    expect(panel).not.toContain("savingBranding");
  });

  test("one module-scoped RSC bootstrap, with a server-only guard", () => {
    const loader = readSource("../src/lib/serverTheme.ts");

    expect(loader).toStartWith('import "server-only";');
    // One import, of one definition. The factory design and the factory
    // branding callbacks are gone: the definition the backend plugin is
    // registered with is the same object this bootstrap renders from, so the
    // design the build ships and the marks it serves cannot drift apart.
    expect(loader).toContain('import { kafilTheme } from "@kafil/server/theme"');
    expect(loader).not.toContain("createReactThemeBootstrap");
    expect(loader).not.toContain("getFactoryDesignConfig");
    expect(loader).not.toContain("getFactoryBranding");
    expect(loader).not.toContain("factory:");
    expect(loader).toContain(
      'getServer: async () => (await import("@kafil/server")).server',
    );
    // The one compatibility override that has to survive: Kafil's routes are
    // `/api/appearance` and `/api/branding`, not `/api/theme/...`.
    expect(loader).toContain('basePath: "/api"');
    expect(loader).not.toContain("onDiagnostic");
    expect(loader).not.toContain("new Request");

    // Code lines only. The file explains in a comment why a second instance is
    // wrong, and counting that sentence as an instance would be the test
    // failing for the opposite of the reason it exists.
    const instances = loader
      .split("\n")
      .filter((line) => line.includes("kafilTheme.react("))
      .filter((line) => !/^\s*(\*|\/\/)/.test(line));
    expect(instances).toEqual(["const serverTheme = kafilTheme.react({"]);
  });

  test("the snapshot is loaded once, by the root layout only", () => {
    // Before the 0.2.0 cutover all three layouts called the loader and relied
    // on it being request-memoized. Now the root layout loads it and hands it
    // to `NThemeBrandingProvider`; the auth and first-login layouts render
    // slots from that context, so they neither import the loader nor thread a
    // `src` down. One load, and one place that can be wrong.
    expect(readSource("../src/app/layout.tsx")).toContain('from "@/lib/serverTheme"');

    for (const path of [
      "../src/app/(auth)/layout.tsx",
      "../src/app/(first-login)/layout.tsx",
    ]) {
      const layout = readSource(path);
      expect(layout).not.toContain("@/lib/serverTheme");
      expect(layout).not.toContain("loadServerBranding");
    }
  });

  test("layouts render slots through the package, not a Kafil path", () => {
    const auth = readSource("../src/app/(auth)/layout.tsx");
    const firstLogin = readSource("../src/app/(first-login)/layout.tsx");

    for (const source of [auth, firstLogin]) {
      expect(source).toContain('import { NThemeImage } from "najm-theme/react"');
      // The slot renderer reads the resolved path *and* the factory path from
      // the provider, so a layout no longer threads `src` through or names a
      // public file to fall back to.
      expect(source).not.toContain("BrandingImage");
      expect(source).not.toContain("src={branding");
      expect(source).not.toContain("authLogoPath");
      expect(source).not.toContain("authHeroImagePath");
      expect(source).not.toContain("logoExpanded.webp");
      expect(source).not.toContain("HeroA.webp");
    }

    expect(auth).toContain('slot="authHeroImage"');
    expect(auth).toContain('slot="authLogo"');
    expect(firstLogin).toContain('slot="authLogo"');
  });

  test("the slot-to-chrome adapter translates two marks and nothing else", () => {
    const provider = readSource("../src/providers/AppProviders.tsx");

    expect(provider).toContain("NajmAppProvider");
    expect(provider).toContain("appName={APP_NAME}");
    // The kit's chrome payload names two marks; the package publishes a slot
    // map. This is the one place the two contracts meet, and it must stay a
    // rename — no resolution, no inheritance, no fallback.
    expect(provider).toContain(
      "sidebarLogoExpandedPath: initialBranding.slots.sidebarLogoExpanded",
    );
    expect(provider).toContain(
      "sidebarLogoCollapsedPath: initialBranding.slots.sidebarLogoCollapsed",
    );
    expect(provider).not.toContain("authLogo");
    expect(provider).not.toContain("??");

    const shell = readSource("../src/shared/DashboardShell/index.tsx");
    expect(shell).toContain("<NSidebar");
    expect(shell).not.toContain("BrandingImage");
  });

  test("the branding provider is mounted once, above every slot consumer", () => {
    const provider = readSource("../src/providers/AppProviders.tsx");

    expect(provider).toContain('import { NThemeBrandingProvider } from "najm-theme/react"');
    expect(provider).toContain("<NThemeBrandingProvider branding={initialBranding}>");

    // Exactly one. `NThemeImage` throws outside the provider on purpose, and a
    // second provider lower in the tree would make a stale snapshot look like a
    // working one.
    const mounts = provider
      .split("\n")
      .filter((line) => line.includes("<NThemeBrandingProvider"));
    expect(mounts).toHaveLength(1);
  });

  test("no Kafil module hard-codes a factory brand path any more", () => {
    // The whole point of the 0.2.0 cutover: the factory bytes are served from
    // the definition, under a content-hashed name, so there is no public path
    // for an application module to name.
    for (const path of [
      "../src/app/layout.tsx",
      "../src/app/(auth)/layout.tsx",
      "../src/app/(first-login)/layout.tsx",
      "../src/providers/AppProviders.tsx",
      "../src/lib/serverTheme.ts",
    ]) {
      const source = readSource(path);
      expect(source).not.toContain("logoExpanded.webp");
      expect(source).not.toContain("HeroA.webp");
      expect(source).not.toContain("@kafil/server/branding-constants");
    }
  });
});
