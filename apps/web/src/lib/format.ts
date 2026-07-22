import { getUiTranslation, type TranslationKey } from "@/i18n/translations";

export type KafilLanguage = "ar" | "en" | "fr";

export function normalizeKafilLanguage(value: unknown): KafilLanguage {
  return value === "ar" || value === "fr" || value === "en" ? value : "en";
}

function selectedKafilLanguage(): KafilLanguage {
  if (typeof document === "undefined") return "en";
  return normalizeKafilLanguage(document.documentElement.lang);
}

const localeByLanguage: Record<KafilLanguage, string> = {
  ar: "ar-MA",
  en: "en-MA",
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
) {
  if (value === null || value === undefined || value === "") return "—";

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat(getLocale(language), {
    dateStyle: "medium",
    timeZone: "Africa/Casablanca",
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
