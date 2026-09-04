import { defineI18n, type TranslationKeys } from "najm-i18n/define";

import ar from "./ar.json";
import en from "./en.json";
import es from "./es.json";
import fr from "./fr.json";

interface JsonObject {
  [key: string]: JsonObject | string;
}

function completeLocale<Default extends JsonObject>(
  defaults: Default,
  overrides: JsonObject,
): Default {
  const result = structuredClone(defaults) as JsonObject;

  for (const [key, value] of Object.entries(overrides)) {
    const current = result[key];
    result[key] =
      typeof current === "object" && current !== null &&
      typeof value === "object" && value !== null
        ? completeLocale(current, value)
        : value;
  }

  return result as Default;
}

export const kafilI18n = defineI18n({
  translations: {
    en,
    fr: completeLocale(en, fr),
    ar: completeLocale(en, ar),
    es: completeLocale(en, es),
  },
  defaultLanguage: "en",
  fallbackToDefaultLanguage: true,
  languageMetadata: {
    en: { locale: "en-MA", direction: "ltr" },
    fr: { locale: "fr-MA", direction: "ltr" },
    ar: { locale: "ar-MA", direction: "rtl" },
    es: { locale: "es-MA", direction: "ltr" },
  },
});

export const translations = kafilI18n.translations;
export const kafilUiI18n = kafilI18n.scope("ui");
export const uiTranslations = kafilUiI18n.translations;

export type KafilLocale = (typeof kafilI18n.supportedLanguages)[number];
export type LocaleDictionary = (typeof translations)[KafilLocale];
export type TranslationKey = TranslationKeys<typeof en>;
export type UiTranslationKey = TranslationKeys<typeof en.ui>;

export { ar, en, es, fr };
export default translations;
