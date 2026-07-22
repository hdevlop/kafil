import { i18n } from "najm-i18n";

import translations from "../locales";

export const KAFIL_SUPPORTED_LANGUAGES = ["en", "fr", "ar", "es"] as const;
export const KAFIL_DEFAULT_LANGUAGE = "en";

export const i18nConfig = () =>
  i18n({
    defaultLanguage: KAFIL_DEFAULT_LANGUAGE,
    supportedLanguages: [...KAFIL_SUPPORTED_LANGUAGES],
    translations,
  });
