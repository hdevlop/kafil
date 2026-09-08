"use client";

import Link from "next/link";
import { ArrowDown, HeartHandshake } from "lucide-react";
import { NButton } from "najm-kit";
import { useTranslation } from "najm-i18n/react";

import { LANDING_ANCHORS, LANDING_ROUTES } from "../config/landingContent";
import { LandingHeroImage } from "./LandingHeroImage";

export function LandingHero() {
  const { language, t } = useTranslation();
  const title = t("landing.hero.title").trim();
  const titleWords = title.split(/\s+/);
  const titleAccent = titleWords.slice(-2).join(" ");
  const titleLead = titleWords.slice(0, -2).join(" ");

  return (
    <section aria-labelledby="landing-hero-title" className="mx-auto grid w-full min-w-0 max-w-6xl items-center gap-8 p-4  sm:px-6 lg:grid-cols-[0.94fr_1.06fr] ">
      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
          {t("landing.hero.eyebrow")}
        </p>
        <h1 id="landing-hero-title" className="max-w-3xl text-balance font-serif text-4xl font-semibold leading-[1.08] tracking-tight text-foreground sm:text-5xl">
          {titleLead ? `${titleLead} ` : null}
          <span className="text-warning">{titleAccent}</span>
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
          {t("landing.hero.description")}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <NButton asChild>
            <Link href={LANDING_ROUTES.apply}>
              <HeartHandshake aria-hidden="true" className="size-4" />
              {t("landing.hero.sponsorCta")}
            </Link>
          </NButton>
          <NButton asChild variant="outline">
            <Link href={`#${LANDING_ANCHORS.families}`}>
              <ArrowDown aria-hidden="true" className="size-4" />
              {t("landing.hero.examplesCta")}
            </Link>
          </NButton>
        </div>
      </div>
      <LandingHeroImage key={language} />
    </section>
  );
}
