"use client";

import { useState } from "react";
import { Languages, Loader2, Maximize, Moon, Sun } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  NButton,
  toast,
} from "najm-kit";
import screenfull from "screenfull";

import { useKafilLanguage } from "@/i18n/KafilLanguageProvider";
import type { KafilLanguage } from "@/lib/format";
import { useThemePreference } from "@/providers/ThemePreferenceProvider";

const actionButtonClass = "text-foreground hover:text-foreground [&_svg]:text-foreground [&_svg]:opacity-100";

const languageFlags: Record<KafilLanguage, { country: string; label: string }> = {
  ar: { country: "ma", label: "Morocco" },
  en: { country: "us", label: "United States" },
  es: { country: "es", label: "Spain" },
  fr: { country: "fr", label: "France" },
};

export default function PageHeaderGlobalActions() {
  const { language, setLanguage, t } = useKafilLanguage();
  const { theme, setTheme } = useThemePreference();
  const [isChangingLanguage, setIsChangingLanguage] = useState(false);

  const languages: Array<{ label: string; value: KafilLanguage }> = [
    { label: t("language.english"), value: "en" },
    { label: t("language.french"), value: "fr" },
    { label: t("language.arabic"), value: "ar" },
    { label: t("language.spanish"), value: "es" },
  ];

  async function handleLanguageChange(nextLanguage: KafilLanguage) {
    setIsChangingLanguage(true);
    try {
      await setLanguage(nextLanguage);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update language preference.");
    } finally {
      setIsChangingLanguage(false);
    }
  }

  const isDark = theme === "dark";
  const ThemeIcon = isDark ? Sun : Moon;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <NButton
            aria-label={t("language.label")}
            className={actionButtonClass}
            disabled={isChangingLanguage}
            size="icon"
            type="button"
            variant="ghost"
          >
            {isChangingLanguage ? <Loader2 className="animate-spin" size={18} /> : <Languages size={18} />}
          </NButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          {languages.map((item) => {
            const flag = languageFlags[item.value];
            const isSelected = language === item.value;
            return (
              <DropdownMenuItem
                className={`cursor-pointer ${isSelected ? "bg-primary text-primary-foreground" : ""}`}
                key={item.value}
                onSelect={() => void handleLanguageChange(item.value)}
              >
                <span
                  aria-hidden="true"
                  className={`fi fi-${flag.country} fis mr-2 inline-block h-3.5 w-5 rounded-[2px] shadow-sm ring-1 ring-black/5`}
                />
                <span className="sr-only">{flag.label}</span>
                {item.label}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>

      <NButton
        aria-label="Toggle color theme"
        className={actionButtonClass}
        onClick={() => void setTheme(isDark ? "light" : "dark")}
        size="icon"
        type="button"
        variant="ghost"
      >
        <ThemeIcon size={18} />
      </NButton>

      <NButton
        aria-label="Toggle fullscreen"
        className={`hidden sm:inline-flex ${actionButtonClass}`}
        onClick={() => {
          if (screenfull.isEnabled) void screenfull.toggle();
        }}
        size="icon"
        type="button"
        variant="ghost"
      >
        <Maximize size={18} />
      </NButton>
    </>
  );
}
