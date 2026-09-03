import { describe, expect, it } from "bun:test";

import translations, { ar, en, es, fr } from "../src/locales";

function leafPaths(value: unknown, prefix = ""): string[] {
  if (typeof value === "string") return [prefix];
  if (!value || typeof value !== "object") return [];

  return Object.entries(value).flatMap(([key, child]) =>
    leafPaths(child, prefix ? `${prefix}.${key}` : key),
  );
}

function leafEntries(value: unknown, prefix = ""): Array<[string, string]> {
  if (typeof value === "string") return [[prefix, value]];
  if (!value || typeof value !== "object") return [];

  return Object.entries(value).flatMap(([key, child]) =>
    leafEntries(child, prefix ? `${prefix}.${key}` : key),
  );
}

/**
 * Keys whose localized value is legitimately identical to English: acronyms
 * (CIN, ID, SKU), international cognates that are already correct in the target
 * language, and address samples. Everything else that matches English is an
 * untranslated stub — the catalog shipped a whole English `ui.operator.families`
 * block inside ar.json and es.json before this guard existed.
 */
const SHARED_WITH_ENGLISH: Record<string, ReadonlySet<string>> = {
  fr: new Set([
    "common.actions",
    "alerts.statuses.active",
    "roles.table.id",
    "roles.table.description",
    "applicants.form.cin",
    "users.form.image",
    "users.table.id",
    "users.table.email",
    "ui.common.table.modeJson",
    "ui.common.pagination.pagination",
    "ui.common.pagination.pageOfUnknown",
    "ui.common.orderArticles",
    "ui.common.actions",
    "ui.nav.contributions",
    "ui.nav.budgets",
    "ui.nav.finance",
    "ui.dashboard.operator.budgetPosition",
    "ui.operator.categories.description",
    "ui.operator.contributions.title",
    "ui.operator.orders.delivery.affiliation",
    "ui.operator.orders.sourceColumn",
    "ui.operator.families.cin",
    "ui.operator.applicants.cin",
    "ui.operator.sponsors.cin",
    "ui.operator.sponsors.notes",
    "ui.operator.assignments.notes",
    "ui.operator.budgets.title",
    "ui.operator.budgets.email",
    "ui.operator.budgets.source",
    "ui.operator.staff.cin",
    "ui.operator.staff.affiliation",
    "ui.operator.staff.affiliationAndCompany",
    "ui.operator.staff.detailsAffiliation",
    "ui.operator.staff.detailsContact",
    "ui.operator.products.description",
    "ui.operator.products.sku",
    "ui.operator.products.image",
    "ui.operator.orders.total",
    "ui.family.cart.total",
    "ui.family.orderCart.total",
    "ui.sponsor.contributions.title",
    "ui.adminAccess.permissions.action",
    "ui.adminAccess.permissions.description",
  ]),
  ar: new Set([
    "ui.common.table.modeJson",
    "ui.operator.staff.emailPlaceholder",
    "ui.operator.staff.provisionAccessEmailPlaceholder",
    "ui.adminAccess.users.emailPlaceholder",
  ]),
  es: new Set([
    "ui.common.table.modeJson",
    "roles.table.id",
    "applicants.form.cin",
    "users.table.id",
    "ui.nav.roles",
    "ui.operator.contributions.cheque",
    "ui.operator.families.cin",
    "ui.operator.families.supportPriorityNormal",
    "ui.operator.applicants.cin",
    "ui.operator.sponsors.cin",
    "ui.operator.staff.cin",
    "ui.operator.products.sku",
    "ui.operator.orders.total",
    "ui.family.cart.total",
    "ui.family.orderCart.total",
    "ui.adminAccess.common.no",
    "ui.adminAccess.roles.title",
  ]),
};

/** Templates made only of placeholders and punctuation never need translating. */
function isLanguageNeutral(value: string) {
  return !/\p{Letter}/u.test(value.replace(/\{\{?\w+\}?\}/g, ""));
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

  it("translates every value that is not a shared acronym or cognate", () => {
    const english = new Map(leafEntries(en));

    for (const [language, source] of Object.entries({ fr, ar, es })) {
      const allowed = SHARED_WITH_ENGLISH[language]!;
      const untranslated = leafEntries(source)
        .filter(([key, value]) => english.get(key) === value)
        .filter(([, value]) => !isLanguageNeutral(value))
        .filter(([key]) => !allowed.has(key))
        .map(([key, value]) => `${key} = ${JSON.stringify(value)}`);

      expect(
        untranslated,
        `${language}.json copies English for ${untranslated.length} key(s). ` +
          `Translate them, or add genuine acronyms/cognates to SHARED_WITH_ENGLISH.`,
      ).toEqual([]);
    }
  });

  it("keeps English out of the Spanish-only server namespaces", () => {
    // en.json once shipped Spanish for roles/permissions/language.
    expect(en.roles.success.retrieved).toBe("Role retrieved successfully");
    expect(en.permissions.success.assigned).toBe(
      "Permission assigned successfully",
    );
    expect(en.language.invalid).toBe("The specified language is not valid");
  });

  it("keeps localized French and Arabic sentinels intact", () => {
    expect(translations.fr.responses.success.retrieved).toContain("réussie");
    expect(translations.ar.responses.success.retrieved).toContain("بنجاح");
  });
});
