import { describe, expect, test } from "bun:test";

import {
  KAFIL_CURRENCY,
  KAFIL_DEFAULT_LANGUAGE,
  KAFIL_DEFAULT_TIME_ZONE,
  KAFIL_LOCALES,
  KAFIL_SUPPORTED_TIME_ZONES,
  isKafilTheme,
  localeForKafilLanguage,
  normalizeKafilLanguage,
  normalizeKafilTimeZone,
} from "@/preferences";

describe("preferences", () => {
  test("normalizeKafilLanguage accepts every supported language", () => {
    for (const language of ["ar", "en", "fr", "es"] as const) {
      expect(normalizeKafilLanguage(language)).toBe(language);
    }
  });

  test("normalizeKafilLanguage falls back to English for anything else", () => {
    expect(normalizeKafilLanguage("klingon")).toBe(KAFIL_DEFAULT_LANGUAGE);
    expect(normalizeKafilLanguage(null)).toBe(KAFIL_DEFAULT_LANGUAGE);
    expect(normalizeKafilLanguage(undefined)).toBe(KAFIL_DEFAULT_LANGUAGE);
    expect(normalizeKafilLanguage(42)).toBe(KAFIL_DEFAULT_LANGUAGE);
  });

  test("normalizeKafilTimeZone accepts every supported zone", () => {
    for (const zone of KAFIL_SUPPORTED_TIME_ZONES) {
      expect(normalizeKafilTimeZone(zone)).toBe(zone);
    }
  });

  test("normalizeKafilTimeZone falls back to Casablanca for unknown values", () => {
    expect(normalizeKafilTimeZone("Mars/Olympus")).toBe(KAFIL_DEFAULT_TIME_ZONE);
    expect(normalizeKafilTimeZone(null)).toBe(KAFIL_DEFAULT_TIME_ZONE);
    expect(normalizeKafilTimeZone(undefined)).toBe(KAFIL_DEFAULT_TIME_ZONE);
  });

  test("KAFIL_LOCALES maps every language to the Moroccan BCP-47 tag", () => {
    expect(KAFIL_LOCALES).toEqual({
      ar: "ar-MA",
      en: "en-MA",
      es: "es-MA",
      fr: "fr-MA",
    });
    for (const [language, locale] of Object.entries(KAFIL_LOCALES)) {
      expect(localeForKafilLanguage(language as keyof typeof KAFIL_LOCALES)).toBe(locale);
    }
  });

  test("isKafilTheme guards light and dark", () => {
    expect(isKafilTheme("light")).toBe(true);
    expect(isKafilTheme("dark")).toBe(true);
    expect(isKafilTheme("high-contrast")).toBe(false);
    expect(isKafilTheme(null)).toBe(false);
  });

  test("KAFIL_CURRENCY is MAD", () => {
    expect(KAFIL_CURRENCY).toBe("MAD");
  });
});
