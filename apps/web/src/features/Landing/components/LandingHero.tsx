"use client";

import Link from "next/link";
import { BadgeCheck, ClipboardCheck, ShieldCheck } from "lucide-react";
import { NButton } from "najm-kit";
import { useTranslation } from "najm-i18n/react";

import { LANDING_ANCHORS, LANDING_ROUTES } from "../config/landingContent";
import { LandingHeroCarousel } from "./LandingHeroCarousel";

const HERO_TRUST = [
  { icon: BadgeCheck, key: "landing.trust.item1Title" },
  { icon: ClipboardCheck, key: "landing.trust.item2Title" },
  { icon: ShieldCheck, key: "landing.trust.item5Title" },
] as const;

export function LandingHero() {
  const { language, t } = useTranslation();

  return (
    <section aria-labelledby="landing-hero-title" className="mx-auto grid w-full min-w-0 max-w-6xl items-center gap-8 px-4 pb-7 pt-10 sm:px-6 lg:grid-cols-[0.94fr_1.06fr] lg:gap-10 lg:pb-8 lg:pt-12">
      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
          {t("landing.hero.eyebrow")}
        </p>
        <h1 id="landing-hero-title" className="max-w-3xl text-balance font-serif text-4xl font-semibold leading-[1.08] tracking-tight text-foreground sm:text-5xl">
          {t("landing.hero.title")}
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
          {t("landing.hero.description")}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <NButton asChild>
            <Link href={LANDING_ROUTES.apply}>{t("landing.hero.sponsorCta")}</Link>
          </NButton>
          <NButton asChild variant="outline">
            <Link href={`#${LANDING_ANCHORS.families}`}>{t("landing.hero.examplesCta")}</Link>
          </NButton>
        </div>
        <ul className="mt-6 flex flex-wrap gap-x-4 gap-y-2" aria-label={t("landing.trust.title")}>
          {HERO_TRUST.map((item) => (
            <li key={item.key} className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <item.icon aria-hidden="true" className="size-4 shrink-0 text-primary" />
              {t(item.key)}
            </li>
          ))}
        </ul>
      </div>
      {/* Remounted per language so the carousel restarts at slide 0 with the
          new locale's slide list instead of carrying an index across. */}
      <LandingHeroCarousel key={language} />
    </section>
  );
}
