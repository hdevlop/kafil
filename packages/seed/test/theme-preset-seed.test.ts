import { describe, expect, it } from "bun:test";
import {
  parseAppearanceDesignConfig,
  themePresetSlug,
} from "@kafil/server/modules";

import { builtInThemePresets } from "../src/theme-preset-seed";

describe("built-in theme presets", () => {
  it("ships the factory theme plus the four alternates", () => {
    expect(builtInThemePresets().map(({ name }) => name)).toEqual([
      "Emerald",
      "Sable",
      "Nuit",
      "Ardoise",
      "Ciel",
    ]);
  });

  it("keeps every shipped design acceptable to the appearance validator", () => {
    for (const preset of builtInThemePresets()) {
      expect(
        () => parseAppearanceDesignConfig(preset.design),
        `${preset.name} must satisfy the appearance validator`,
      ).not.toThrow();
    }
  });

  it("gives every built-in a distinct slug so re-seeding stays idempotent", () => {
    const slugs = builtInThemePresets().map(({ name }) => themePresetSlug(name));

    expect(new Set(slugs).size).toBe(slugs.length);
    expect(slugs).toEqual(["emerald", "sable", "nuit", "ardoise", "ciel"]);
  });

  it("defines a light mode and a dark override for every shipped theme", () => {
    for (const preset of builtInThemePresets()) {
      const design = parseAppearanceDesignConfig(preset.design);

      expect(design.theme.mode, `${preset.name} mode`).toBe("light");
      expect(
        Object.keys(design.theme.tokens ?? {}).length,
        `${preset.name} light tokens`,
      ).toBeGreaterThan(0);
      expect(
        Object.keys(design.theme.overrides?.dark ?? {}).length,
        `${preset.name} dark override`,
      ).toBeGreaterThan(0);
    }
  });
});
