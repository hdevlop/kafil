"use client";

import { NNextImage } from "najm-kit/next";
import { useTranslation } from "najm-i18n/react";
import type { KafilLocale } from "@kafil/server/locales";

import { heroSlidesByLanguage } from "../config/landingHeroSlides";

export function LandingHeroImage() {
  const { language, t } = useTranslation();
  const locale = language as KafilLocale;
  const image = heroSlidesByLanguage[locale]?.[0] ?? heroSlidesByLanguage.en[0];

  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-3xl bg-card">
      <NNextImage
        src={image.src}
        fallbackSrc={image.fallbackSrc}
        alt={t(image.altKey)}
        fill
        sizes="(max-width: 768px) 100vw, 50vw"
        className="object-cover"
        priority
      />
    </div>
  );
}
