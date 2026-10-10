import { i18n } from "najm-i18n";

import { kafilI18n, LANGUAGE_HEADER, UI_LANGUAGE_COOKIE } from "@kafil/contracts/locales";

export const KAFIL_SUPPORTED_LANGUAGES = kafilI18n.supportedLanguages;
export const KAFIL_DEFAULT_LANGUAGE = kafilI18n.defaultLanguage;

/**
 * A refusal arrives in the language the page shows. The web app names it in
 * LANGUAGE_HEADER, which the server preset reads first; a request without the
 * header (the auth client's own sign-in and refresh, MCP) falls back to the
 * interface-language cookie, then `?lang=`. Detection never writes a cookie.
 *
 * najm-i18n's defaults read a `language` cookie the web app never sets, so a
 * French page received English refusals.
 */
export const i18nConfig = () =>
  i18n({
    ...kafilI18n.options,
    server: { languageHeader: LANGUAGE_HEADER },
    lookupCookie: UI_LANGUAGE_COOKIE,
  });
