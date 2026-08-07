import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

import { themePresetKeys } from "../src/hooks/themePresetKeys";
import {
  applyThemePreset,
  createThemePreset,
  deleteThemePreset,
  listThemePresets,
} from "../src/services/themePresetApi";

function readSource(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

describe("theme preset query keys", () => {
  test("shares one namespace with a stable list key", () => {
    expect(themePresetKeys.all).toEqual(["themePresets"]);
    expect(themePresetKeys.list).toEqual(["themePresets", "list"]);
  });
});

describe("theme preset api surface", () => {
  test("exposes list, create, apply, and delete callables", () => {
    expect(listThemePresets.length).toBe(0);
    expect(createThemePreset.length).toBe(1);
    expect(applyThemePreset.length).toBe(1);
    expect(deleteThemePreset.length).toBe(1);
  });

  test("targets the admin theme-presets routes", () => {
    const source = readSource("../src/services/themePresetApi.ts");

    expect(source).toContain('api.get<ThemePreset[]>("/theme-presets")');
    expect(source).toContain('api.post<ThemePreset>("/theme-presets"');
    expect(source).toContain("`/theme-presets/${id}/apply`");
    expect(source).toContain("`/theme-presets/${id}`");
  });
});

describe("theme preset commands", () => {
  test("applying a preset invalidates both the preset list and the appearance", () => {
    const source = readSource("../src/hooks/useThemePresets.ts");

    expect(source).toContain('"use client"');
    expect(source).toContain(
      "invalidate: [themePresetKeys.all, appearanceKeys.all]",
    );
    // Create and delete only move the library, never the live appearance.
    expect(source).toContain("mutationFn: createThemePreset");
    expect(source).toContain("mutationFn: deleteThemePreset");
  });

  test("the list query stays disabled until the theme tab is open", () => {
    const hook = readSource("../src/hooks/useThemePresets.ts");
    const sheet = readSource(
      "../src/features/Settings/components/GlobalSettingsSheet.tsx",
    );

    expect(hook).toContain("useThemePresets(enabled: boolean)");
    expect(hook).toContain("enabled,");
    expect(sheet).toContain('enabled={open && activeTab === "theme"}');
  });
});

describe("theme preset selector", () => {
  const panel = () =>
    readSource("../src/features/Settings/components/ThemePresetsPanel.tsx");

  test("renders the shared Najm Kit picker rather than a Kafil copy", () => {
    const source = panel();

    expect(source).toContain('"use client"');
    expect(source).toContain("NThemePresets");
    // The dropdown, swatches, and dialogs belong to the kit now.
    expect(source).not.toContain("<SelectTrigger");
    expect(source).not.toContain("ThemeSwatch");
    expect(source).not.toContain("NConfirmDialog");
  });

  test("selecting a theme only loads it into the in-memory draft", () => {
    const source = panel();

    expect(source).toContain("setDraft(preset.design)");
    // Choosing a theme must never reach the server on its own.
    expect(source).not.toContain("applyPreset");
  });

  test("offers a way back to the saved theme", () => {
    const source = panel();

    // The kit hands back null for its "current saved theme" row.
    expect(source).toContain("if (!preset) {");
    expect(source).toContain("cancelDraft()");
    expect(source).toContain("savedDesign={appearance.designConfig}");
  });

  test("maps the server projection onto the kit's preset shape", () => {
    const source = panel();

    expect(source).toContain("design: preset.designConfig");
    expect(source).toContain("isBuiltIn: preset.isBuiltIn");
  });

  test("saves whatever the admin is currently previewing", () => {
    expect(panel()).toContain("designConfig: draft ?? appearance.designConfig");
  });

  test("localizes every kit label from the Kafil catalog", () => {
    const source = panel();

    for (const key of [
      "title",
      "selectPlaceholder",
      "savedOption",
      "saveCurrent",
      "deleteTitle",
    ]) {
      expect(source).toContain(`operator.settings.presets.${key}`);
    }
  });

  test("KafilUIProvider exposes replaceCommitted for out-of-draft writes", () => {
    const hook = readSource("../src/providers/useAppearanceState.ts");

    expect(hook).toContain("replaceCommitted");
    expect(hook).toContain('dispatch({ type: "replace_committed", appearance })');
  });
});

describe("global settings theme tab", () => {
  const sheet = () =>
    readSource("../src/features/Settings/components/GlobalSettingsSheet.tsx");

  test("puts the theme selector above the customizer", () => {
    const source = sheet();
    const selector = source.indexOf("<ThemePresetsPanel");
    const customizer = source.indexOf("<ThemeSettingsPanel");

    expect(selector).toBeGreaterThan(-1);
    expect(customizer).toBeGreaterThan(-1);
    expect(selector).toBeLessThan(customizer);
  });

  test("keeps the previewed theme alive when the sheet closes", () => {
    const source = sheet();

    expect(source).toContain(
      "// The theme draft intentionally survives: it is the live preview.",
    );
    expect(source).not.toContain("cancelAppearanceDraft()");
    // Only branding and app settings can still block a close.
    expect(source).toContain(
      "const dirty = appState.dirty || branding.isDirty;",
    );
  });

  test("saving a loaded theme goes through apply so nothing is dropped", () => {
    const source = sheet();

    expect(source).toContain("if (selectedPresetId) {");
    expect(source).toContain("applyPreset.mutateAsync({");
    expect(source).toContain("expectedRevision: revision");
    expect(source).toContain("replaceCommitted(applied)");
    // Tweaks layered on top of a preset still take the ordinary edit path.
    expect(source).toContain("await commitDraft({ designConfig: draft, expectedRevision: revision });");
  });
});
