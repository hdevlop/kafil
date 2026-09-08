"use client";

import Link from "next/link";
import { NButton } from "najm-kit";
import { NNextImage } from "najm-kit/next";
import { useTranslation } from "najm-i18n/react";

import { LANDING_ANCHORS, LANDING_ROUTES } from "../config/landingContent";
import { LANDING_CTA_MASCOT_SRC, MASCOT_HEIGHT, MASCOT_WIDTH } from "../config/landingMascots";

export function LandingCtaBanner() {
  const { t } = useTranslation();

  return (
    <section aria-labelledby="landing-cta-title" className="mx-auto w-full min-w-0 max-w-6xl px-4 pb-8 sm:px-6 lg:pb-10">
      <div className="flex flex-col items-center gap-5 overflow-hidden rounded-2xl bg-primary px-6 py-5 text-primary-foreground sm:px-8 md:flex-row">
        <div className="shrink-0">
          <NNextImage
            src={LANDING_CTA_MASCOT_SRC}
            fallbackSrc={LANDING_CTA_MASCOT_SRC}
            alt=""
            width={MASCOT_WIDTH}
            height={MASCOT_HEIGHT}
            sizes="(max-width: 768px) 80px, 96px"
            className="h-20 w-auto object-contain motion-safe:transition-transform motion-safe:hover:-translate-y-1 motion-reduce:transform-none motion-reduce:transition-none md:h-24"
            loading="lazy"
          />
        </div>
        <div className="min-w-0 flex-1 text-center md:text-start">
          <h2 id="landing-cta-title" className="font-serif text-xl font-semibold tracking-tight sm:text-2xl">
            {t("landing.cta.title")}
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-5 opacity-90">
            {t("landing.cta.text")}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-center gap-3">
          <NButton asChild variant="secondary" size="sm">
            <Link href={LANDING_ROUTES.apply}>{t("landing.cta.sponsorCta")}</Link>
          </NButton>
          <NButton asChild variant="outline" size="sm" className="border-primary-foreground/50 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground">
            <Link href={`#${LANDING_ANCHORS.families}`}>{t("landing.cta.familiesCta")}</Link>
          </NButton>
        </div>
      </div>
    </section>
  );
}
