import { describe, expect, test } from "bun:test";

import {
  formatStatusLabel,
  getStatusTranslationKey,
  KAFIL_BADGE_DEFAULTS,
} from "@/features/StatusLabels";

const KNOWN_STATUSES = [
  "active",
  "approved",
  "cancelled",
  "delivered",
  "ended",
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

describe("formatStatusLabel", () => {
  test("returns the catalog translation for every known status in every language", () => {
    for (const status of KNOWN_STATUSES) {
      for (const language of ["en", "fr", "ar", "es"] as const) {
        const label = formatStatusLabel(status, language);
        expect(label).not.toBe(status);
        expect(label.length).toBeGreaterThan(0);
      }
    }
  });

  test("normalizes case and surrounding whitespace before lookup", () => {
    expect(formatStatusLabel("  PENDING  ")).toBe(formatStatusLabel("pending"));
    expect(formatStatusLabel("Out_For_Delivery")).toBe(formatStatusLabel("out_for_delivery"));
    expect(formatStatusLabel("out-for-delivery")).toBe(formatStatusLabel("out_for_delivery"));
    expect(formatStatusLabel("out for delivery")).toBe(formatStatusLabel("out_for_delivery"));
  });

  test("falls back to the kit's humanizer for unknown status values", () => {
    expect(formatStatusLabel("brand_new_state")).toBe("Brand New State");
    expect(formatStatusLabel("not_assigned")).toBe("Not Assigned");
  });

  test("getStatusTranslationKey returns the catalog key for known statuses", () => {
    expect(getStatusTranslationKey("pending")).toBe("status.pending");
    expect(getStatusTranslationKey("out_for_delivery")).toBe("status.out_for_delivery");
    expect(getStatusTranslationKey("in_preparation")).toBe("status.in_preparation");
  });

  test("getStatusTranslationKey returns null for unknown statuses", () => {
    expect(getStatusTranslationKey("totally_made_up")).toBeNull();
  });

  test("exports the provider policy used by direct NBadge consumers", () => {
    expect(KAFIL_BADGE_DEFAULTS.look).toBe("soft");
    expect(KAFIL_BADGE_DEFAULTS.shape).toBe("pill");
    expect(KAFIL_BADGE_DEFAULTS.statusLabelKeys?.pending).toBe("status.pending");
  });
});
