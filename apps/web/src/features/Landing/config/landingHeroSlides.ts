import type { HeroSlideAltKey, HeroSlidesByLanguage } from "../types";

export const HERO_SLIDE_WIDTH = 1448;
export const HERO_SLIDE_HEIGHT = 1086;
export const HERO_NEUTRAL_FALLBACK = "/hero/hero-family_en.png";

function slide(
  id: string,
  src: string,
  fallbackSrc: string,
  altKey: HeroSlideAltKey,
): HeroSlidesByLanguage[keyof HeroSlidesByLanguage][number] {
  return {
    id,
    src,
    fallbackSrc,
    width: HERO_SLIDE_WIDTH,
    height: HERO_SLIDE_HEIGHT,
    altKey,
  };
}

// One static hero image per locale, using only files that exist in public.
// Spanish uses a text-free project-generated family illustration so switching
// locale never exposes English artwork.
export const heroSlidesByLanguage: HeroSlidesByLanguage = {
  en: [
    slide("en", "/hero/hero-family_en.png", "/hero/hero-family_en.png", "landing.hero.slide1Alt"),
  ],
  fr: [
    slide("fr", "/hero/hero-family_fr.png", "/hero/hero-family_fr.png", "landing.hero.slide1Alt"),
  ],
  ar: [
    slide("ar", "/hero/hero-family_ar.png", "/hero/hero-family_ar.png", "landing.hero.slide1Alt"),
  ],
  es: [
    slide("es", "/landing/family-example-02-v2.png", "/landing/family-example-02-v2.png", "landing.hero.slide1Alt"),
  ],
};
