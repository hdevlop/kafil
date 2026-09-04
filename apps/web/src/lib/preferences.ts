import { defineNajmPreferences } from "najm-kit/server";
import { kafilI18n } from "@kafil/server/locales";

/**
 * Kafil's UI preferences. Configuration only — Najm owns the behavior.
 *
 * The three cookie names are the ones already deployed, so existing browsers
 * keep their language, theme, and time zone. Everything else is a Najm
 * default: `light`, the two theme modes, the canonical time-zone list, and
 * the `HttpOnly; SameSite=Lax; Path=/` year-long cookie.
 */
export const kafilPreferences = defineNajmPreferences({
  i18n: kafilI18n,
  defaultTimeZone: "Africa/Casablanca",
  cookieNames: {
    language: "kafil-ui-language",
    theme: "kafil-ui-theme",
    timeZone: "kafil-ui-timezone",
  },
});
