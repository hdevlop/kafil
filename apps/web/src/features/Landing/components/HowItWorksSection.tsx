"use client";

import { ArrowRight } from "lucide-react";
import { NCard, useNajmFormat } from "najm-kit";
import { useTranslation } from "najm-i18n/react";

import { LANDING_ANCHORS } from "../config/landingContent";
import { LANDING_PROCESS_STEPS } from "../config/landingSectionContent";

export function HowItWorksSection() {
  const { t } = useTranslation();
  const fmt = useNajmFormat();

  return (
    <section
      aria-labelledby="landing-process-title"
      className="mx-auto w-full min-w-0 max-w-6xl scroll-mt-24 px-4 py-10 sm:px-6 sm:py-14 lg:py-16"
      id={LANDING_ANCHORS.howItWorks}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
        {t("landing.process.eyebrow")}
      </p>
      <h2
        className="mt-2 max-w-4xl font-serif text-3xl font-semibold tracking-tight text-foreground sm:text-4xl"
        id="landing-process-title"
      >
        {t("landing.process.title")}
      </h2>
      <div aria-hidden className="mt-3 h-1 w-12 rounded-full bg-primary" />
      <p className="mt-3 max-w-3xl text-base leading-7 text-muted-foreground">
        {t("landing.process.description")}
      </p>

      <ol className="mt-7 grid list-none grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4 lg:gap-6">
        {LANDING_PROCESS_STEPS.map((step, index) => {
          const Icon = step.icon;

          return (
            <li className="relative min-w-0" key={step.id}>
              <NCard
                bordered
                noPadding
                className="h-full bg-card shadow-none"
              >
                <div className="flex h-full min-h-52 flex-col items-center px-5 py-6 text-center">
                  <span className="self-start rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
                    {fmt.number(step.number)}
                  </span>
                  <span className="mt-1 grid size-20 place-items-center rounded-full bg-primary/10 text-primary">
                    <Icon aria-hidden className="size-10" strokeWidth={1.7} />
                  </span>
                  <h3 className="mt-4 text-base font-semibold text-foreground">
                    {t(step.titleKey)}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {t(step.textKey)}
                  </p>
                </div>
              </NCard>
              {index < LANDING_PROCESS_STEPS.length - 1 ? (
                <span
                  aria-hidden
                  className="absolute -end-5 top-1/2 z-10 hidden -translate-y-1/2 text-primary/60 lg:block"
                >
                  <ArrowRight className="size-4 rtl:rotate-180" />
                </span>
              ) : null}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
