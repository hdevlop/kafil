export type KafilLanguage = "ar" | "en" | "es" | "fr";

export type KafilTheme = "light" | "dark";

export const KAFIL_DEFAULT_TIME_ZONE = "Africa/Casablanca" as const;

export const KAFIL_SUPPORTED_TIME_ZONES = [
  "Africa/Casablanca",
  "Africa/Tunis",
  "Africa/Algiers",
  "Africa/Cairo",
  "Europe/Paris",
  "Europe/Madrid",
  "Europe/London",
  "Europe/Berlin",
  "Europe/Istanbul",
  "America/New_York",
  "America/Los_Angeles",
  "UTC",
] as const;

export type KafilTimeZone = (typeof KAFIL_SUPPORTED_TIME_ZONES)[number];

const kafilLanguageSet: ReadonlySet<string> = new Set(["ar", "en", "es", "fr"]);

export function normalizeKafilLanguage(value: unknown): KafilLanguage {
  return typeof value === "string" && kafilLanguageSet.has(value)
    ? (value as KafilLanguage)
    : "en";
}

const kafilTimeZoneSet: ReadonlySet<string> = new Set(KAFIL_SUPPORTED_TIME_ZONES);

export function normalizeKafilTimeZone(value: unknown): KafilTimeZone {
  return typeof value === "string" && kafilTimeZoneSet.has(value)
    ? (value as KafilTimeZone)
    : KAFIL_DEFAULT_TIME_ZONE;
}

export function isKafilTheme(value: unknown): value is KafilTheme {
  return value === "light" || value === "dark";
}

export const KAFIL_DEFAULT_LANGUAGE: KafilLanguage = "en";

export const KAFIL_DEFAULT_THEME: KafilTheme = "light";

export const KAFIL_CURRENCY = "MAD" as const;

const localeByLanguage: Record<KafilLanguage, string> = {
  ar: "ar-MA",
  en: "en-MA",
  es: "es-MA",
  fr: "fr-MA",
};

export const KAFIL_LOCALES: Record<KafilLanguage, string> = localeByLanguage;

export function localeForKafilLanguage(language: KafilLanguage): string {
  return localeByLanguage[language];
}
