import type { KafilLocale, UiTranslationKey } from "@kafil/server/locales";

export type HeroSlideAltKey = Extract<
  UiTranslationKey,
  | "landing.hero.slide1Alt"
  | "landing.hero.slide2Alt"
  | "landing.hero.esSlide1Alt"
  | "landing.hero.esSlide2Alt"
>;

export interface HeroSlide {
  id: string;
  src: string;
  fallbackSrc: string;
  width: number;
  height: number;
  altKey: HeroSlideAltKey;
}

export type HeroSlidesByLanguage = Record<KafilLocale, readonly HeroSlide[]>;

export interface LandingMascot {
  src: string;
  width: number;
  height: number;
}

export interface LandingFamilyExample {
  id: string;
  nameKey: UiTranslationKey;
  cityKey: UiTranslationKey;
  members: number;
  needMinor: number;
  imageSrc: string;
}
