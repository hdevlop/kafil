import { i18n } from "najm-i18n";

import { kafilI18n } from "../locales";

export const KAFIL_SUPPORTED_LANGUAGES = kafilI18n.supportedLanguages;
export const KAFIL_DEFAULT_LANGUAGE = kafilI18n.defaultLanguage;

export const i18nConfig = () => i18n(kafilI18n.options);
