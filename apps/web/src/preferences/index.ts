import { kafilI18n, type KafilLocale } from "@kafil/server/locales";

export type KafilLanguage = KafilLocale;

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

export function normalizeKafilLanguage(value: unknown): KafilLanguage {
  return kafilI18n.normalizeLanguage(value);
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

export const KAFIL_DEFAULT_LANGUAGE = kafilI18n.defaultLanguage;

export const KAFIL_DEFAULT_THEME: KafilTheme = "light";

export const KAFIL_CURRENCY = "MAD" as const;

export const KAFIL_LOCALES = Object.fromEntries(
  kafilI18n.supportedLanguages.map((language) => [language, kafilI18n.locale(language)]),
) as Record<KafilLanguage, string>;

export function localeForKafilLanguage(language: KafilLanguage): string {
  return kafilI18n.locale(language);
}
