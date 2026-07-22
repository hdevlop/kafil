import {
  uiTranslations,
  type UiTranslationKey,
} from "@kafil/server/locales";

import type { KafilLanguage } from "@/lib/format";

export type TranslationKey = UiTranslationKey;

export function getNestedTranslation(
  dictionary: unknown,
  key: string,
): string | undefined {
  const value = key.split(".").reduce<unknown>((current, segment) => {
    if (!current || typeof current !== "object") return undefined;
    return (current as Record<string, unknown>)[segment];
  }, dictionary);

  return typeof value === "string" ? value : undefined;
}

export function getUiTranslation(
  language: KafilLanguage,
  key: TranslationKey,
) {
  return getNestedTranslation(uiTranslations[language], key) ?? key;
}
