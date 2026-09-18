"use client";

import {
  NFullscreenToggle,
  NGlobalActions,
  NLanguageMenu,
  NThemeToggle,
  toast,
  type NLanguageOption,
} from "najm-kit";

import { useTranslation } from "najm-i18n/react";
import type { KafilLocale } from "@kafil/server/locales";
import { NotificationsMenu } from "@/features/Notifications";
import { updateNotificationSettings } from "@/services/notificationsApi";

const languageFlags: Record<KafilLocale, { country: string; label: string }> = {
  ar: { country: "ma", label: "Morocco" },
  en: { country: "us", label: "United States" },
  es: { country: "es", label: "Spain" },
  fr: { country: "fr", label: "France" },
};

function flag(locale: KafilLocale) {
  return (
    <span
      className={`fi fi-${languageFlags[locale].country} fis inline-block h-3.5 w-5 rounded-[2px] shadow-sm ring-1 ring-black/5`}
    />
  );
}

export default function PageHeaderGlobalActions() {
  const { language, changeLanguage, t } = useTranslation();

  const languages: Array<NLanguageOption<KafilLocale>> = (
    [
      ["en", "language.english"],
      ["fr", "language.french"],
      ["ar", "language.arabic"],
      ["es", "language.spanish"],
    ] as const
  ).map(([value, key]) => ({
    value,
    label: t(key),
    icon: flag(value),
    iconLabel: languageFlags[value].label,
  }));

  async function handleLanguageChange(nextLanguage: KafilLocale) {
    await changeLanguage(nextLanguage);
    // External-channel locale follows the UI language as an explicit
    // command. A sync failure never blocks the UI change; the notifications
    // surface retries it on entry.
    try {
      await updateNotificationSettings(nextLanguage);
    } catch {
      // Surfaced again from the notifications inbox; see NotificationsPage.
    }
  }

  return (
    <NGlobalActions>
      <NotificationsMenu />
      <NLanguageMenu
        label={t("language.label")}
        onChange={handleLanguageChange}
        onError={(error) =>
          toast.error(
            error instanceof Error
              ? error.message
              : "Could not update language preference.",
          )
        }
        options={languages}
        value={(language ?? "en") as KafilLocale}
      />
      <NThemeToggle
        label={t("common.toggleTheme")}
        onError={(error) =>
          toast.error(
            error instanceof Error ? error.message : "Could not update color theme.",
          )
        }
      />
      <NFullscreenToggle label={t("common.toggleFullscreen")} />
    </NGlobalActions>
  );
}
