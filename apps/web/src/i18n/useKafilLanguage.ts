"use client";

import { useTranslation } from "najm-i18n/react";
import { useCallback, useMemo } from "react";

import type { KafilLanguage } from "@/lib/format";
import type { TranslationKey } from "./translations";

type TranslationValues = Record<string, string | number>;

/**
 * Kafil's catalog keys, typed.
 *
 * The `I18nProvider` this reads from is mounted by `NajmAppProvider`, which
 * also derives the `NTable` pagination labels from the same translator — so the
 * only thing left for the application to own here is the key union, which is
 * why this is a hook and no longer a provider.
 */
export function useKafilLanguage() {
  const { language, t, changeLanguage } = useTranslation<
    TranslationKey,
    KafilLanguage
  >();

  const setLanguage = useCallback(
    async (nextLanguage: KafilLanguage) => {
      if (nextLanguage === language) return;
      const changed = await changeLanguage(nextLanguage);
      if (!changed) throw new Error(`Unsupported language: ${nextLanguage}`);
    },
    [changeLanguage, language],
  );

  return useMemo(
    () => ({
      language,
      setLanguage,
      t: t as (key: TranslationKey, values?: TranslationValues) => string,
    }),
    [language, setLanguage, t],
  );
}
