import type { KafilLocale, UiTranslationKey } from "@kafil/server/locales";
import type { LucideIcon } from "lucide-react";

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
  status: "active" | "pending";
  members: number;
  needMinor: number;
  imageSrc: string;
}

export type LandingSectionAssetKey =
  | "dignityFamily"
  | "schoolBag"
  | "notebooks"
  | "stationery";

export interface LandingSectionAsset {
  src: string;
  width: number;
  height: number;
  decorative: boolean;
  altKey?: UiTranslationKey;
}

export interface LandingSectionItem {
  id: string;
  icon: LucideIcon;
  titleKey: UiTranslationKey;
  textKey: UiTranslationKey;
}

export interface LandingProcessStep extends LandingSectionItem {
  number: number;
}

export interface LandingSampleProduct {
  id: string;
  nameKey: UiTranslationKey;
  assetKey: Exclude<LandingSectionAssetKey, "dignityFamily">;
  amountMinor: number;
}

export interface LandingOrderStatus {
  id: string;
  icon: LucideIcon;
  labelKey: UiTranslationKey;
}

export interface LandingFaqItem {
  id: string;
  questionKey: UiTranslationKey;
  answerKey: UiTranslationKey;
}
