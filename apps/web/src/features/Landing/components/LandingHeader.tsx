"use client";

import { useState } from "react";
import Link from "next/link";
import { Languages, Loader2, Menu, Moon, Sun, X } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  NButton,
  toast,
  useNajmTheme,
} from "najm-kit";
import { NThemeImage } from "najm-theme/react";
import { useTranslation } from "najm-i18n/react";
import type { KafilLocale } from "@kafil/server/locales";

import { LANDING_ANCHORS, LANDING_ROUTES } from "../config/landingContent";

// Flag icons are purely decorative: the localized language name beside them
// already carries the meaning, so no accessible country label is emitted.
const languageFlags: Record<KafilLocale, { country: string }> = {
  ar: { country: "ma" },
  en: { country: "us" },
  es: { country: "es" },
  fr: { country: "fr" },
};

// Language/theme preferences through the existing contracts: the same
// `changeLanguage` persistence (with pending state and localized error) and
// the same `setTheme` persistence the dashboard header uses. No second
// mechanism, no raw controls.
function LandingPreferences() {
  const { language, changeLanguage, t } = useTranslation();
  const { theme, setTheme } = useNajmTheme();
  const [isChangingLanguage, setIsChangingLanguage] = useState(false);
  const isDark = theme === "dark";
  const ThemeIcon = isDark ? Sun : Moon;

  const languages: Array<{ label: string; value: KafilLocale }> = [
    { label: t("language.english"), value: "en" },
    { label: t("language.french"), value: "fr" },
    { label: t("language.arabic"), value: "ar" },
    { label: t("language.spanish"), value: "es" },
  ];

  async function handleLanguageChange(nextLanguage: KafilLocale) {
    setIsChangingLanguage(true);
    try {
      await changeLanguage(nextLanguage);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("landing.header.languageError"));
    } finally {
      setIsChangingLanguage(false);
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <NButton
            aria-label={t("language.label")}
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
                  className={`fi fi-${flag.country} fis me-2 inline-block h-3.5 w-5 rounded-[2px] shadow-sm ring-1 ring-black/5`}
                />
                {item.label}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>

      <NButton
        aria-label={t("landing.header.themeToggle")}
        onClick={() => void setTheme(isDark ? "light" : "dark")}
        size="icon"
        type="button"
        variant="ghost"
      >
        <ThemeIcon size={18} />
      </NButton>
    </>
  );
}

export function LandingHeader() {
  const { t } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);

  const links = [
    { href: LANDING_ROUTES.home, label: t("landing.header.home") },
    { href: `#${LANDING_ANCHORS.families}`, label: t("landing.header.families") },
    { href: `#${LANDING_ANCHORS.howItWorks}`, label: t("landing.header.howItWorks") },
    { href: `#${LANDING_ANCHORS.contact}`, label: t("landing.header.contact") },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
      <a
        href="#landing-main"
        className="sr-only focus:not-sr-only focus:absolute focus:start-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
      >
        {t("landing.skip")}
      </a>
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-2 sm:px-6">
        <Link href={LANDING_ROUTES.home} className="flex min-w-0 items-center gap-2 rounded-md" aria-label={`Kafil — ${t("landing.header.home")}`}>
          <NThemeImage slot="sidebarLogoExpanded" alt="Kafil" className="h-7 w-auto" />
        </Link>

        <nav aria-label={t("landing.header.navLabel")} className="hidden items-center gap-1 md:flex">
          <ul className="flex items-center gap-1">
            {links.map((link) => (
              <li key={link.href + link.label}>
                <NButton asChild variant="ghost" size="sm">
                  <Link href={link.href}>{link.label}</Link>
                </NButton>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-1">
          <LandingPreferences />
          <NButton asChild size="sm" className="ms-1 hidden sm:inline-flex">
            <Link href={LANDING_ROUTES.login}>{t("landing.header.signIn")}</Link>
          </NButton>
          <NButton
            type="button"
            size="icon"
            variant="ghost"
            className="md:hidden"
            aria-label={menuOpen ? t("landing.header.closeMenu") : t("landing.header.openMenu")}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X size={18} /> : <Menu size={18} />}
          </NButton>
        </div>
      </div>

      {menuOpen ? (
        <nav aria-label={t("landing.header.navLabel")} className="border-t border-border md:hidden">
          <ul className="space-y-1 px-4 py-3 sm:px-6">
            {links.map((link) => (
              <li key={link.href + link.label}>
                <NButton asChild variant="ghost" size="sm" className="w-full justify-start">
                  <Link href={link.href} onClick={() => setMenuOpen(false)}>
                    {link.label}
                  </Link>
                </NButton>
              </li>
            ))}
            <li>
              <NButton asChild size="sm" className="w-full sm:hidden">
                <Link href={LANDING_ROUTES.login} onClick={() => setMenuOpen(false)}>
                  {t("landing.header.signIn")}
                </Link>
              </NButton>
            </li>
          </ul>
        </nav>
      ) : null}
    </header>
  );
}
