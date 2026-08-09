"use client";

import { Globe2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  toast,
} from "najm-kit";

import { useKafilLanguage } from "@/i18n/useKafilLanguage";
import type { KafilLanguage } from "@/preferences";

const languageOptions = [
  { country: "us", label: "English", value: "en" },
  { country: "fr", label: "Fran\u00e7ais", value: "fr" },
  { country: "ma", label: "\u0627\u0644\u0639\u0631\u0628\u064a\u0629", value: "ar" },
  { country: "es", label: "Espa\u00f1ol", value: "es" },
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
    <Select
      onValueChange={(value) => void handleLanguageChange(value as KafilLanguage)}
      value={language}
    >
      <SelectTrigger
        aria-label="Select language"
        className="h-12 w-auto min-w-36 rounded-2xl border-border bg-card/90 px-4 text-base font-medium text-foreground shadow-sm shadow-foreground/5 [&>svg]:text-primary"
      >
        <Globe2 aria-hidden="true" className="size-5 text-primary" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end">
        {languageOptions.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
