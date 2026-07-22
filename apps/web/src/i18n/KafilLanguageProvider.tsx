"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import type { KafilLanguage } from "@/lib/format";
import { getUiTranslation, type TranslationKey } from "./translations";

type TranslationValues = Record<string, string | number>;

interface KafilLanguageContextValue {
  language: KafilLanguage;
  setLanguage: (language: KafilLanguage) => Promise<void>;
  t: (key: TranslationKey, values?: TranslationValues) => string;
}

const KafilLanguageContext = createContext<KafilLanguageContextValue | null>(null);

function interpolate(template: string, values?: TranslationValues) {
  if (!values) return template;
  return template.replace(/\{(\w+)\}/g, (placeholder, name: string) =>
    Object.prototype.hasOwnProperty.call(values, name)
      ? String(values[name])
      : placeholder,
  );
}

export function KafilLanguageProvider({
  children,
  initialLanguage,
}: Readonly<{ children: React.ReactNode; initialLanguage: KafilLanguage }>) {
  const [language, setLanguageState] = useState(initialLanguage);
  const router = useRouter();

  const setLanguage = useCallback(async (nextLanguage: KafilLanguage) => {
    if (nextLanguage === language) return;

    const response = await fetch("/api/ui-language", {
      body: JSON.stringify({ language: nextLanguage }),
      headers: { "content-type": "application/json" },
      method: "POST",
    });

    if (!response.ok) throw new Error("Could not update language preference.");

    document.documentElement.dir = nextLanguage === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = nextLanguage;
    setLanguageState(nextLanguage);
    router.refresh();
  }, [language, router]);

  const value = useMemo<KafilLanguageContextValue>(() => ({
    language,
    setLanguage,
    t: (key, values) => interpolate(getUiTranslation(language, key), values),
  }), [language, setLanguage]);

  return <KafilLanguageContext.Provider value={value}>{children}</KafilLanguageContext.Provider>;
}

export function useKafilLanguage() {
  const context = useContext(KafilLanguageContext);
  if (!context) throw new Error("useKafilLanguage must be used within KafilLanguageProvider.");
  return context;
}
