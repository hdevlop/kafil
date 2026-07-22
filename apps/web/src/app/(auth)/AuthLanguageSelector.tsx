"use client";

import { ChevronDown, Globe2 } from "lucide-react";
import { toast } from "najm-kit";

import { useKafilLanguage } from "@/i18n/KafilLanguageProvider";
import type { KafilLanguage } from "@/lib/format";

const languageOptions = [
  { label: "English", value: "en" },
  { label: "Fran\u00e7ais", value: "fr" },
  { label: "\u0627\u0644\u0639\u0631\u0628\u064a\u0629", value: "ar" },
] as const;

export function AuthLanguageSelector() {
  const { language, setLanguage } = useKafilLanguage();

  async function handleLanguageChange(nextLanguage: KafilLanguage) {
    try {
      await setLanguage(nextLanguage);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not update language preference.",
      );
    }
  }

  return (
    <label className="relative flex h-12 items-center rounded-2xl border border-border bg-card/90 pl-4 pr-10 text-sm font-medium text-foreground shadow-sm shadow-foreground/5">
      <Globe2 aria-hidden="true" className="mr-3 size-5 text-primary" />
      <span className="sr-only">Select language</span>
      <select
        aria-label="Select language"
        className="h-full cursor-pointer appearance-none bg-transparent pr-1 text-base outline-none"
        onChange={(event) => void handleLanguageChange(event.target.value as KafilLanguage)}
        value={language}
      >
        {languageOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3 size-5 text-primary" />
    </label>
  );
}
