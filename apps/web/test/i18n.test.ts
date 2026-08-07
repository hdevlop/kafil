import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  getNestedTranslation,
  getUiTranslation,
} from "../src/i18n/translations";

describe("shared web locale adapter", () => {
  test("hands the catalog to the kit provider and keeps the typed hook", () => {
    // Mounting `I18nProvider` and persisting the choice moved into
    // `NajmAppProvider`, which also owns the "no router refresh on language"
    // guarantee — a refresh would discard the catalog swap najm-i18n already
    // did on the client. What stays Kafil's is the key union, so the provider
    // is gone and the typed hook is not.
    const provider = readFileSync(
      join(import.meta.dir, "../src/providers/KafilUIProvider.tsx"),
      "utf8",
    );
    expect(provider).toContain('from "najm-kit/app"');
    expect(provider).toContain("translations={uiTranslations}");
    expect(provider).toContain("initialLanguage={initialLanguage}");
    expect(provider).not.toContain("router.refresh");

    const hook = readFileSync(
      join(import.meta.dir, "../src/i18n/useKafilLanguage.ts"),
      "utf8",
    );
    expect(hook).toContain('from "najm-i18n/react"');
    expect(hook).toContain("useTranslation");
    expect(hook).not.toContain("<I18nProvider");
  });

  test("reads the server-owned UI catalog in each visible language", () => {
    expect(getUiTranslation("en", "dashboard.operator.title")).toBe("Operator dashboard");
    expect(getUiTranslation("fr", "dashboard.operator.title")).toBeTruthy();
    expect(getUiTranslation("ar", "dashboard.operator.title")).toBeTruthy();
  });

  test("returns undefined only for an absent nested value", () => {
    expect(getNestedTranslation({ nested: { value: "ok" } }, "nested.value"))
      .toBe("ok");
    expect(getNestedTranslation({ nested: {} }, "nested.missing")).toBeUndefined();
  });

  test("resolves nested applicant gender keys", () => {
    expect(
      getNestedTranslation(
        { applicants: { form: { gender: { female: "Female" } } } },
        "applicants.form.gender.female",
      ),
    ).toBe("Female");

    for (const language of ["en", "fr", "ar", "es"] as const) {
      expect(getUiTranslation(language, "applicants.form.genderLabel"))
        .not.toBe("applicants.form.genderLabel");
      expect(getUiTranslation(language, "applicants.form.gender.female"))
        .not.toBe("applicants.form.gender.female");
      expect(getUiTranslation(language, "applicants.form.gender.male"))
        .not.toBe("applicants.form.gender.male");
    }
  });

  test("localizes the complete operator sponsor workflow", () => {
    expect(getUiTranslation("en", "operator.sponsors.createTitle")).toBe(
      "Create sponsor account",
    );
    expect(getUiTranslation("fr", "operator.sponsors.createTitle")).toBe(
      "Créer un compte parrain",
    );
    expect(getUiTranslation("ar", "operator.sponsors.createTitle")).toBe(
      "إنشاء حساب كفيل",
    );

    for (const language of ["en", "fr", "ar"] as const) {
      expect(getUiTranslation(language, "operator.sponsors.fullName")).toBeTruthy();
      expect(getUiTranslation(language, "operator.sponsors.createAndInvite")).toBeTruthy();
      expect(getUiTranslation(language, "operator.sponsors.createSuccess")).toBeTruthy();
    }
  });

  test("localizes the complete operator support-assignment workflow", () => {
    expect(getUiTranslation("fr", "operator.assignments.title")).toBe(
      "Attributions de soutien",
    );
    expect(getUiTranslation("ar", "operator.assignments.createTitle")).toBe(
      "إنشاء تعيين دعم",
    );

    for (const language of ["en", "fr", "ar"] as const) {
      expect(getUiTranslation(language, "operator.assignments.loading")).toBeTruthy();
      expect(getUiTranslation(language, "operator.assignments.createAssignment")).toBeTruthy();
      expect(getUiTranslation(language, "operator.assignments.endSuccess")).toBeTruthy();
    }
  });

  test("localizes the complete operator contribution workflow", () => {
    expect(getUiTranslation("en", "operator.contributions.title")).toBe(
      "Contributions",
    );
    expect(getUiTranslation("en", "operator.contributions.emptyTitle")).toBe(
      "No contribution records",
    );

    for (const language of ["en", "fr", "ar"] as const) {
      expect(getUiTranslation(language, "operator.contributions.subtitle")).toBeTruthy();
      expect(getUiTranslation(language, "operator.contributions.record")).toBeTruthy();
      expect(getUiTranslation(language, "operator.contributions.emptyDescription")).toBeTruthy();
      expect(getUiTranslation(language, "operator.contributions.validateAndCredit")).toBeTruthy();
      expect(getUiTranslation(language, "operator.contributions.refundContribution")).toBeTruthy();
      expect(getUiTranslation(language, "operator.contributions.deleteContribution")).toBeTruthy();
    }
  });

  test("localizes the complete operator budget workflow", () => {
    expect(getUiTranslation("fr", "operator.budgets.title")).toBe("Budgets");
    expect(getUiTranslation("fr", "operator.budgets.filterPrivateFamily")).toBe(
      "Filtrer par famille privée",
    );

    for (const language of ["en", "fr", "ar"] as const) {
      expect(getUiTranslation(language, "operator.budgets.subtitle")).toBeTruthy();
      expect(getUiTranslation(language, "operator.budgets.emptyTitle")).toBeTruthy();
      expect(getUiTranslation(language, "operator.budgets.available")).toBeTruthy();
      expect(getUiTranslation(language, "operator.budgets.searchEntryType")).toBeTruthy();
      expect(getUiTranslation(language, "operator.budgets.saveMonthlyLimit")).toBeTruthy();
      expect(getUiTranslation(language, "operator.budgets.recordAdjustment")).toBeTruthy();
    }
  });
});
