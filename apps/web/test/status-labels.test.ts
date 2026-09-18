import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

import { formatStatusLabel } from "@/features/StatusLabels";
import { kafilUiI18n } from "@kafil/server/locales";

const LANGUAGES = ["en", "fr", "ar", "es"] as const;

/** Statuses Kafil words itself, in `ui.status.*`. */
const APP_STATUSES = [
  "active",
  "approved",
  "cancelled",
  "delivered",
  "ended",
  "expired",
  "inactive",
  "in_preparation",
  "purchased",
  "out_for_delivery",
  "paused",
  "pending",
  "pending_funding",
  "rejected",
  "refunded",
  "stopped",
  "validated",
] as const;

/**
 * Statuses Kafil declares nowhere and Najm Kit labels for it.
 *
 * The point of the list is that it is *not* in our catalog and not in any map
 * of ours — before the shared vocabulary these rendered as humanized English on
 * a French or Arabic screen.
 */
const PACKAGED_STATUSES = ["completed", "draft", "overdue", "partially_paid", "present"] as const;

function readSource(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

/**
 * Kafil's half of the shared status vocabulary.
 *
 * What is *not* here on purpose: precedence between explicit labels, children
 * and provider overrides, regional locale fallback, live language switching,
 * badge appearance, and provider-tree isolation. Those are `najm-kit`'s
 * contract and are covered by its own rendering tests. What matters here is
 * that our wording survived the move and that the tokens we never declared are
 * now translated rather than humanized.
 */
describe("formatStatusLabel", () => {
  test("keeps Kafil's wording for the statuses Kafil declares", () => {
    for (const status of APP_STATUSES) {
      for (const language of LANGUAGES) {
        expect(formatStatusLabel(status, language)).toBe(
          kafilUiI18n.translate(language, `status.${status}`),
        );
      }
    }
  });

  test("keeps the domain wording the packaged label would have replaced", () => {
    // "In preparation" is the packaged default. Ours names what the operator is
    // actually doing, and generic is not an upgrade.
    expect(formatStatusLabel("in_preparation", "en")).toBe("Purchasing and preparation");
    expect(formatStatusLabel("in_preparation", "fr")).toBe("Achat et préparation");
  });

  test("translates statuses Kafil never declared, from the package", () => {
    for (const status of PACKAGED_STATUSES) {
      const labels = LANGUAGES.map((language) => formatStatusLabel(status, language));

      for (const label of labels) {
        expect(label).not.toContain("status.");
        expect(label.length).toBeGreaterThan(0);
      }
      // Four languages, not one English string repeated.
      expect(new Set(labels).size).toBeGreaterThan(1);
    }

    expect(formatStatusLabel("overdue", "fr")).toBe("En souffrance");
    expect(formatStatusLabel("partially_paid", "ar")).toBe("مدفوع جزئيًا");
  });

  test("normalizes case and surrounding whitespace before lookup", () => {
    expect(formatStatusLabel("  PENDING  ")).toBe(formatStatusLabel("pending"));
    expect(formatStatusLabel("Out_For_Delivery")).toBe(formatStatusLabel("out_for_delivery"));
    expect(formatStatusLabel("out-for-delivery")).toBe(formatStatusLabel("out_for_delivery"));
    expect(formatStatusLabel("out for delivery")).toBe(formatStatusLabel("out_for_delivery"));
  });

  test("humanizes an unknown status without leaking a catalog key", () => {
    expect(formatStatusLabel("brand_new_state")).toBe("Brand New State");
    expect(formatStatusLabel("not_assigned")).toBe("Not Assigned");
    expect(formatStatusLabel("brand_new_state", "fr")).not.toContain("status.");
  });
});

describe("badge defaults stay in the package", () => {
  test("the provider forwards no badge policy", () => {
    const providers = readSource("../src/providers/AppProviders.tsx");

    expect(providers).not.toContain("badgeDefaults");
    expect(providers).not.toContain("KAFIL_BADGE_DEFAULTS");
  });

  test("no token-to-key table survives anywhere in the app", () => {
    const feature = readSource("../src/features/StatusLabels/index.ts");

    expect(feature).not.toContain("statusTranslationKeys");
    expect(feature).not.toContain("getStatusTranslationKey");
    expect(feature).not.toContain("KAFIL_BADGE_DEFAULTS");
  });
});
