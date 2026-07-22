import ar from "./ar.json";
import en from "./en.json";
import es from "./es.json";
import fr from "./fr.json";

interface JsonObject {
  [key: string]: JsonObject | string;
}

function mergeLocale<Default extends JsonObject>(
  defaults: Default,
  overrides: JsonObject,
): Default {
  const result = structuredClone(defaults) as JsonObject;

  for (const [key, value] of Object.entries(overrides)) {
    const current = result[key];
    result[key] =
      typeof current === "object" && current !== null &&
      typeof value === "object" && value !== null
        ? mergeLocale(current, value)
        : value;
  }

  return result as Default;
}

export const translations = {
  en,
  fr: mergeLocale(en, fr),
  ar: mergeLocale(en, ar),
  es: mergeLocale(en, es),
} as const;

export const uiTranslations = {
  en: translations.en.ui,
  fr: translations.fr.ui,
  ar: translations.ar.ui,
  es: translations.es.ui,
} as const;

export type KafilLocale = keyof typeof translations;
export type LocaleDictionary = (typeof translations)[KafilLocale];

type Join<Key extends string, Suffix> = Suffix extends string
  ? `${Key}.${Suffix}`
  : never;
type LeafPaths<Value> = Value extends string
  ? never
  : {
      [Key in Extract<keyof Value, string>]: Value[Key] extends string
        ? Key
        : Join<Key, LeafPaths<Value[Key]>>;
    }[Extract<keyof Value, string>];

export type TranslationKey = LeafPaths<typeof en>;
export type UiTranslationKey = LeafPaths<typeof en.ui>;

export { ar, en, es, fr };
export default translations;
