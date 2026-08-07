import { getUiTranslation, type TranslationKey } from "@/i18n/translations";

export type KafilLanguage = "ar" | "en" | "es" | "fr";

export type KafilTheme = "light" | "dark";

export function normalizeKafilLanguage(value: unknown): KafilLanguage {
  return value === "ar" || value === "en" || value === "es" || value === "fr"
    ? value
    : "en";
}

function selectedKafilLanguage(): KafilLanguage {
  if (typeof document === "undefined") return "en";
  return normalizeKafilLanguage(document.documentElement.lang);
}

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

const kafilTimeZoneSet: ReadonlySet<string> = new Set(KAFIL_SUPPORTED_TIME_ZONES);

export function normalizeKafilTimeZone(value: unknown): KafilTimeZone {
  return typeof value === "string" && kafilTimeZoneSet.has(value)
    ? (value as KafilTimeZone)
    : KAFIL_DEFAULT_TIME_ZONE;
}

function selectedKafilTimeZone(): KafilTimeZone {
  if (typeof document === "undefined") return KAFIL_DEFAULT_TIME_ZONE;
  return normalizeKafilTimeZone(document.documentElement.dataset.timeZone);
}

const localeByLanguage: Record<KafilLanguage, string> = {
  ar: "ar-MA",
  en: "en-MA",
  es: "es-MA",
  fr: "fr-MA",
};

function getLocale(language: KafilLanguage) {
  return localeByLanguage[language];
}

export function formatMad(
  minorUnits: number | null | undefined,
  language: KafilLanguage = selectedKafilLanguage(),
) {
  if (
    minorUnits === null ||
    minorUnits === undefined ||
    !Number.isSafeInteger(minorUnits)
  ) {
    return "—";
  }

  return new Intl.NumberFormat(getLocale(language), {
    style: "currency",
    currency: "MAD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(minorUnits / 100);
}

export function formatKafilNumber(
  value: number | null | undefined,
  language: KafilLanguage = selectedKafilLanguage(),
) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "—";
  }

  return new Intl.NumberFormat(getLocale(language)).format(value);
}

export function formatKafilDate(
  value: Date | number | string | null | undefined,
  language: KafilLanguage = selectedKafilLanguage(),
  timeZone: KafilTimeZone = selectedKafilTimeZone(),
) {
  if (value === null || value === undefined || value === "") return "—";

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat(getLocale(language), {
    dateStyle: "medium",
    timeZone,
  }).format(date);
}

export function formatDateTime(
  value: Date | number | string | null | undefined,
  language: KafilLanguage = selectedKafilLanguage(),
  timeZone: KafilTimeZone = selectedKafilTimeZone(),
) {
  if (value === null || value === undefined || value === "") return "—";

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat(getLocale(language), {
    dateStyle: "short",
    timeStyle: "short",
    timeZone,
  }).format(date);
}

const statusTranslationKeys: Record<string, TranslationKey> = {
  active: "status.active",
  approved: "status.approved",
  cancelled: "status.cancelled",
  delivered: "status.delivered",
  ended: "status.ended",
  inactive: "status.inactive",
  in_preparation: "status.in_preparation",
  purchased: "status.purchased",
  out_for_delivery: "status.out_for_delivery",
  paused: "status.paused",
  pending: "status.pending",
  pending_funding: "status.pending_funding",
  rejected: "status.rejected",
  refunded: "status.refunded",
  stopped: "status.stopped",
  validated: "status.validated",
};

export function formatStatusLabel(
  status: string,
  language: KafilLanguage = selectedKafilLanguage(),
) {
  const translationKey = statusTranslationKeys[status.trim().toLowerCase()];
  if (translationKey) return getUiTranslation(language, translationKey);

  return status
    .trim()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
