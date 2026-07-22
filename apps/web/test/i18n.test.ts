import { describe, expect, test } from "bun:test";

import {
  getNestedTranslation,
  getUiTranslation,
} from "../src/i18n/translations";

describe("shared web locale adapter", () => {
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
