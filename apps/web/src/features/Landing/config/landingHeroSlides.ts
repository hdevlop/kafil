import type { HeroSlideAltKey, HeroSlidesByLanguage } from "../types";

export const HERO_SLIDE_WIDTH = 1448;
export const HERO_SLIDE_HEIGHT = 1086;
export const HERO_NEUTRAL_FALLBACK = "/hero/hero-family-neutral.webp";

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

// Explicit locale-to-slide manifest. Every list is locale-pure: rotation
// never shows another language's embedded-text artwork. The first slide of
// each locale falls back to the language-neutral image; later slides fall
// back to their own locale's first slide.
export const heroSlidesByLanguage: HeroSlidesByLanguage = {
  en: [
    slide("en-1", "/hero/hero-family_en.png", HERO_NEUTRAL_FALLBACK, "landing.hero.slide1Alt"),
    slide("en-2", "/hero/hero-family_en-02.png", "/hero/hero-family_en.png", "landing.hero.slide2Alt"),
  ],
  fr: [
    slide("fr-1", "/hero/hero-family_fr.png", HERO_NEUTRAL_FALLBACK, "landing.hero.slide1Alt"),
    slide("fr-2", "/hero/hero-family_fr-02.png", "/hero/hero-family_fr.png", "landing.hero.slide2Alt"),
  ],
  ar: [
    slide("ar-1", "/hero/hero-family_ar.png", HERO_NEUTRAL_FALLBACK, "landing.hero.slide1Alt"),
    slide("ar-2", "/hero/hero-family_ar-02.png", "/hero/hero-family_ar.png", "landing.hero.slide2Alt"),
  ],
  es: [
    slide("es-1", "/hero/hero-family_es.png", HERO_NEUTRAL_FALLBACK, "landing.hero.esSlide1Alt"),
    slide("es-2", "/hero/hero-family_es-02.png", "/hero/hero-family_es.png", "landing.hero.esSlide2Alt"),
  ],
};
