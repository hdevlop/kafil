import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { kafilI18n, kafilUiI18n } from "@kafil/server/locales";

describe("shared web locale definition", () => {
  test("hands the scoped definition to the kit and uses the package hook directly", () => {
    const provider = readFileSync(
      join(import.meta.dir, "../src/providers/AppProviders.tsx"),
      "utf8",
    );
    expect(provider).toContain('from "najm-kit/app"');
    expect(provider).toContain("translations={kafilUiI18n.translations}");
    expect(provider).toContain(
      "fallbackToDefaultLanguage={kafilUiI18n.fallbackToDefaultLanguage}",
    );
    expect(provider).toContain("getLanguageDirection={(language)");
    expect(provider).toContain(
      "kafilUiI18n.direction(kafilUiI18n.normalizeLanguage(language))",
    );
    expect(provider).toContain("initialLanguage={initialLanguage}");
    expect(provider).not.toContain("router.refresh");

    expect(
      existsSync(join(import.meta.dir, "../src/i18n/useKafilLanguage.ts")),
    ).toBe(false);
    const action = readFileSync(
      join(import.meta.dir, "../src/shared/PageHeaderGlobalActions.tsx"),
      "utf8",
    );
    expect(action).toContain('from "najm-i18n/react"');
    expect(action).toContain("useTranslation()");
  });

  test("owns language validation, locale, and direction in one definition", () => {
    expect(kafilI18n.supportedLanguages).toEqual(["en", "fr", "ar", "es"]);
    expect(kafilI18n.normalizeLanguage("fr")).toBe("fr");
    expect(kafilI18n.normalizeLanguage("unknown")).toBe("en");
    expect(kafilI18n.locale("fr")).toBe("fr-MA");
    expect(kafilI18n.direction("ar")).toBe("rtl");
    expect(kafilI18n.direction("es")).toBe("ltr");
  });

  test("reads localized UI keys and falls back per key", () => {
    expect(kafilUiI18n.translate("en", "dashboard.operator.title")).toBe(
      "Operator dashboard",
    );
    expect(kafilUiI18n.translate("fr", "dashboard.operator.title")).not.toBe(
      "dashboard.operator.title",
    );
    expect(kafilUiI18n.translate("ar", "applicants.form.gender.female")).not.toBe(
      "applicants.form.gender.female",
    );
    expect(kafilUiI18n.fallbackToDefaultLanguage).toBe(true);
  });

  test("localizes the complete operator workflows", () => {
    const keys = [
      "operator.sponsors.createTitle",
      "operator.assignments.createTitle",
      "operator.contributions.emptyTitle",
      "operator.budgets.available",
    ] as const;

    for (const language of ["en", "fr", "ar"] as const) {
      for (const key of keys) {
        expect(kafilUiI18n.translate(language, key)).not.toBe(key);
      }
    }
  });
});
