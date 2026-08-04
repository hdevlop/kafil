"use client";

import { I18nProvider, useTranslation } from "najm-i18n/react";
import { useCallback, useMemo } from "react";

import type { KafilLanguage } from "@/lib/format";
import { uiTranslations, type TranslationKey } from "./translations";

type TranslationValues = Record<string, string | number>;

export function KafilLanguageProvider({
  children,
  initialLanguage,
}: Readonly<{ children: React.ReactNode; initialLanguage: KafilLanguage }>) {
  const persistLanguage = useCallback(async (nextLanguage: KafilLanguage) => {
    const response = await fetch("/api/ui-language", {
      body: JSON.stringify({ language: nextLanguage }),
      headers: { "content-type": "application/json" },
      method: "POST",
    });

    if (!response.ok) throw new Error("Could not update language preference.");
  }, []);

  return (
    <I18nProvider
      translations={uiTranslations}
      initialLanguage={initialLanguage}
      defaultLanguage="en"
      onLanguageChange={persistLanguage}
    >
      {children}
    </I18nProvider>
  );
}

export function useKafilLanguage() {
  const { language, t, changeLanguage } = useTranslation<
    TranslationKey,
    KafilLanguage
  >();

  const setLanguage = useCallback(async (nextLanguage: KafilLanguage) => {
    if (nextLanguage === language) return;
    const changed = await changeLanguage(nextLanguage);
    if (!changed) throw new Error(`Unsupported language: ${nextLanguage}`);
  }, [changeLanguage, language]);

  return useMemo(() => ({
    language,
    setLanguage,
    t: t as (key: TranslationKey, values?: TranslationValues) => string,
  }), [language, setLanguage, t]);
}
