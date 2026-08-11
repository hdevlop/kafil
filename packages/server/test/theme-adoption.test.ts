import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { getRoutes } from "najm-core";
import {
  STANDARD_BRANDING_SLOT_KEYS,
  resolveThemeConfig,
  themePluginConfig,
} from "najm-theme/server";

import { kafilTheme, KAFIL_HERO_MAX_BYTES, KAFIL_LOGO_MAX_BYTES } from "@kafil/server/theme";
import {
  BrandingAssetCompatController,
  ThemePresetCompatController,
} from "../src/modules/settings";

/**
 * Kafil's half of the `najm-theme` adoption.
 *
 * Revision conflicts, slot resolution, upload validation, orphan sweeps, and
 * preset slugs are the package's contract and the package's tests. What is
 * pinned here is configuration — the values Kafil supplies, the shape of the
 * factory directory it owns, and the two temporary redirects.
 */
describe("najm-theme adoption — Kafil configuration", () => {
  it("supplies a factory design the package policy accepts", () => {
    const design = kafilTheme.appearance();

    expect(design.theme).toBeDefined();
    // Called per read, so it must not hand out the same mutable object twice.
    expect(kafilTheme.appearance()).not.toBe(design);
    expect(kafilTheme.appearance()).toEqual(design);
  });

  it("resolves the factory directory from the module, never the process", () => {
    const source = readFileSync(new URL("../../theme/index.ts", import.meta.url), "utf8");

    expect(source).toContain("defineTheme(import.meta.url");
    // The working directory differs between a root script, a workspace script,
    // the test runner, and the container entrypoint. A design discovered
    // relative to it is a design that resolves differently in each.
    expect(source).not.toContain("process.cwd()");
    expect(source).not.toContain("readFileSync");
    expect(source).not.toContain("existsSync");
    // No static import of the design either — the package reads and validates
    // it. Matched on the import form rather than the bare file name, because
    // the surrounding comment names the file on purpose.
    expect(source).not.toMatch(/import\s+\w+\s+from\s+["'].*theme\.json["']/);
  });

  it("ships all four factory assets, which is what replaced slot inheritance", () => {
    const slots = kafilTheme.assets.map((asset) => asset.slot).sort();
    expect(slots).toEqual([...STANDARD_BRANDING_SLOT_KEYS].sort());

    for (const asset of kafilTheme.assets) {
      expect(asset.mimeType).toBe("image/webp");
      expect(asset.bytes).toBeGreaterThan(0);
      // The content hash is in the file name, which is what makes the immutable
      // cache header on the serve route honest.
      expect(asset.fileName).toContain(asset.contentHash);
    }
  });

  it("keeps the three logo slots byte-identical, preserving the old inheritance", () => {
    // Before 0.2.0 `sidebarLogoCollapsed` and `authLogo` carried no factory
    // value and resolved through `inheritFrom: "sidebarLogoExpanded"`. The
    // package now requires a file per slot, so identical bytes are what keeps
    // the rendered result the same: one mark on the expanded rail, the
    // collapsed rail, and the sign-in page.
    const expanded = kafilTheme.asset("sidebarLogoExpanded");
    const collapsed = kafilTheme.asset("sidebarLogoCollapsed");
    const authLogo = kafilTheme.asset("authLogo");

    expect(expanded?.contentHash).toBeDefined();
    expect(collapsed?.contentHash).toBe(expanded!.contentHash);
    expect(authLogo?.contentHash).toBe(expanded!.contentHash);

    // The hero is a different image and must not have been swept up in that.
    expect(kafilTheme.asset("authHeroImage")?.contentHash).not.toBe(expanded!.contentHash);
  });

  it("serves a factory asset by name and refuses anything else", () => {
    const asset = kafilTheme.asset("authHeroImage")!;

    const served = kafilTheme.serveAsset(asset.fileName);
    expect(served).not.toBeNull();
    expect(served!.headers.get("content-type")).toBe("image/webp");
    expect(served!.headers.get("x-content-type-options")).toBe("nosniff");
    expect(served!.headers.get("cache-control")).toContain("immutable");

    // Nothing reaches the filesystem, so traversal is impossible by
    // construction rather than by check.
    expect(kafilTheme.serveAsset("../../../etc/passwd")).toBeNull();
    expect(kafilTheme.serveAsset("not-a-real-file.webp")).toBeNull();
  });

  it("mounts branding under Kafil's own paths, not the package default", () => {
    // `/api` is the server base Kafil's frontend calls; the plugin base is
    // empty. Together they must keep the published `/api/branding/...` shape.
    const branding = kafilTheme.branding("/api");

    for (const key of STANDARD_BRANDING_SLOT_KEYS) {
      expect(branding[key]).toStartWith("/api/branding/factory/");
    }
    expect(branding.sidebarLogoExpanded).not.toContain("/theme/");
  });

  it("declares Kafil's own byte ceilings", () => {
    // 2 MB logos and 5 MB hero, not the package's 512 KB / 2 MB. Assets that
    // were legal under Kafil's old uploader must stay legal after the cutover.
    expect(KAFIL_LOGO_MAX_BYTES).toBe(2_000_000);
    expect(KAFIL_HERO_MAX_BYTES).toBe(5_000_000);

    const resolved = resolveThemeConfig(
      themePluginConfig(kafilTheme, {
        basePath: "",
        manage: [() => undefined],
        features: { mcp: true },
        limits: { logoBytes: KAFIL_LOGO_MAX_BYTES, heroBytes: KAFIL_HERO_MAX_BYTES },
      }),
    );

    const byKey = Object.fromEntries(resolved.brandingSlots.map((slot) => [slot.key, slot]));
    expect(byKey.sidebarLogoExpanded.maxBytes).toBe(2_000_000);
    expect(byKey.sidebarLogoCollapsed.maxBytes).toBe(2_000_000);
    expect(byKey.authLogo.maxBytes).toBe(2_000_000);
    expect(byKey.authHeroImage.maxBytes).toBe(5_000_000);
  });

  it("registers an empty base path and public reads so Kafil's routes survive", () => {
    // Resolved rather than read off the literal: the plugin normalizes, and a
    // basePath that only looks right in source is the bug this catches.
    const resolved = resolveThemeConfig(
      themePluginConfig(kafilTheme, {
        basePath: "",
        manage: [() => undefined],
        features: { mcp: true },
      }),
    );

    expect(resolved.basePath).toBe("");
    // `read` omitted means anonymous reads, which the sign-in page needs.
    expect(resolved.publicRead).toBe(true);
    expect(resolved.storage.namespace).toBeDefined();
    // Kafil's schema comment always said a built-in could not be deleted and
    // its service deleted them anyway. Adopting the package default resolves
    // that in the direction the comment documented.
    expect(resolved.limits.allowBuiltInPresetDeletion).toBe(false);
  });

  it("redirects the two retired paths without handling them", () => {
    const presetRoutes = getRoutes(ThemePresetCompatController);
    const assetRoutes = getRoutes(BrandingAssetCompatController);

    expect(presetRoutes).toHaveLength(4);
    expect(assetRoutes).toHaveLength(1);

    const presets = new ThemePresetCompatController();
    const list = presets.listPresets();
    expect(list.status).toBe(308);
    expect(list.headers.get("location")).toBe("/api/presets");

    // 307 preserves the method and the body, so a client that has not been
    // redeployed still creates a preset rather than silently GETting the list.
    const apply = presets.applyPreset("2f5c1a3e");
    expect(apply.status).toBe(307);
    expect(apply.headers.get("location")).toBe("/api/presets/2f5c1a3e/apply");

    const asset = new BrandingAssetCompatController().serveAsset("a-b-c.webp");
    expect(asset.status).toBe(308);
    expect(asset.headers.get("location")).toBe("/api/branding/assets/a-b-c.webp");

    // A redirect and nothing else: no state read, no state written, so it
    // cannot drift from the route it points at.
    for (const response of [list, apply, asset]) {
      expect(response.body).toBeNull();
    }
  });
});
