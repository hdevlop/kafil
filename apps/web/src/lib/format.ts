// `najm-kit/format`, not `najm-kit`: this module is reachable from the root
// layout and from route handlers, and the root barrel pulls in the whole
// component library — which fails to build under the `react-server` condition.
// The leaf entry carries no components.
import {
  formatCurrency,
  formatDate,
  formatDateTime as formatKitDateTime,
  formatNumber,
  humanizeToken,
  type NajmFormatConfig,
} from "najm-kit/format";

import { getUiTranslation, type TranslationKey } from "@/i18n/translations";

/**
 * Kafil's formatting vocabulary, over `najm-kit`'s formatters.
 *
 * What lives here is only what is Kafil's: the four locales, the dirham, the
 * time zones the picker offers, and the status catalog. The formatting itself —
 * Intl instance caching, minor-unit scaling, placeholder handling — is the
 * kit's.
 *
 * Call sites keep their existing signatures. The `language` and `timeZone`
 * defaults are still read off the document, which is what lets a non-component
 * caller (a column definition, a view-model builder) format without a hook. In
 * a component prefer `useNajmFormat()` from the kit, which reads the same
 * preferences from context and re-renders when they change.
 */

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

// Language and region are separate choices: `fr` alone formats the French way,
// which is not how numbers and dates are written in Morocco.
const localeByLanguage: Record<KafilLanguage, string> = {
  ar: "ar-MA",
  en: "en-MA",
  es: "es-MA",
  fr: "fr-MA",
};

function config(
  language: KafilLanguage,
  timeZone: KafilTimeZone = KAFIL_DEFAULT_TIME_ZONE,
): NajmFormatConfig {
  return { locale: localeByLanguage[language], timeZone, currency: "MAD" };
}

/** Formats an integer count of centimes as dirhams. */
export function formatMad(
  minorUnits: number | null | undefined,
  language: KafilLanguage = selectedKafilLanguage(),
) {
  return formatCurrency(minorUnits, config(language));
}

export function formatKafilNumber(
  value: number | null | undefined,
  language: KafilLanguage = selectedKafilLanguage(),
) {
  return formatNumber(value, config(language));
}

export function formatKafilDate(
  value: Date | number | string | null | undefined,
  language: KafilLanguage = selectedKafilLanguage(),
  timeZone: KafilTimeZone = selectedKafilTimeZone(),
) {
  return formatDate(value, config(language, timeZone));
}

export function formatDateTime(
  value: Date | number | string | null | undefined,
  language: KafilLanguage = selectedKafilLanguage(),
  timeZone: KafilTimeZone = selectedKafilTimeZone(),
) {
  return formatKitDateTime(value, config(language, timeZone));
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

  // No catalog entry: the kit's humanizer is the fallback, not a substitute.
  return humanizeToken(status);
}
