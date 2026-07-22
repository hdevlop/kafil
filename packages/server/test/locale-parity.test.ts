import { describe, expect, it } from "bun:test";

import translations, { ar, en, es, fr } from "../src/locales";

function leafPaths(value: unknown, prefix = ""): string[] {
  if (typeof value === "string") return [prefix];
  if (!value || typeof value !== "object") return [];

  return Object.entries(value).flatMap(([key, child]) =>
    leafPaths(child, prefix ? `${prefix}.${key}` : key),
  );
}

describe("locale catalog parity", () => {
  it("keeps server and UI values in one source file per language", async () => {
    for (const [language, dictionary] of Object.entries({ en, fr, ar, es })) {
      expect(dictionary.ui, `${language}.json is missing its ui catalog`)
        .toBeDefined();
      expect(
        await Bun.file(`src/locales/ui.${language}.json`).exists(),
        `ui.${language}.json must not split the locale catalog`,
      ).toBe(false);
    }
  });

  it("resolves the complete English key shape in every supported language", () => {
    const expected = new Set(leafPaths(translations.en));

    for (const [language, dictionary] of Object.entries(translations)) {
      const actual = new Set(leafPaths(dictionary));
      for (const key of expected) {
        expect(actual.has(key), `${language} is missing ${key}`).toBe(true);
      }
    }
  });

  it("keeps localized French and Arabic sentinels intact", () => {
    expect(translations.fr.responses.success.retrieved).toContain("réussie");
    expect(translations.ar.responses.success.retrieved).toContain("بنجاح");
  });
});
