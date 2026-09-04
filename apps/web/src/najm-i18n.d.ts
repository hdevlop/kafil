import type { KafilLocale, UiTranslationKey } from "@kafil/server/locales";

declare module "najm-i18n/react" {
  interface NajmI18nRegistry {
    key: UiTranslationKey;
    language: KafilLocale;
  }
}

export {};
