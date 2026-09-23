import type { KafilLocale, UiTranslationKey } from "@kafil/contracts/locales";

declare module "najm-i18n/react" {
  interface NajmI18nRegistry {
    key: UiTranslationKey;
    language: KafilLocale;
  }
}

export {};
