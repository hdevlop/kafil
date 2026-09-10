"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { NButton, NGrid, NGridItem } from "najm-kit";
import { useTranslation } from "najm-i18n/react";

import { LANDING_ANCHORS } from "../config/landingContent";
import { LANDING_TRANSPARENCY_BENEFITS } from "../config/landingSectionContent";
import { ExampleOrderCard } from "./ExampleOrderCard";

export function TransparencySection() {
  const { t } = useTranslation();

  return (
    <section
      aria-labelledby="landing-transparency-title"
      className="mx-auto w-full min-w-0 max-w-6xl scroll-mt-24 px-4 py-4 sm:px-6 sm:py-6 lg:py-8"
      id={LANDING_ANCHORS.transparency}
    >
      <NGrid
        cols={1}
        gap="clamp(2.5rem, 5vw, 3.5rem)"
        lgCols={2}
        className="items-start"
      >
        <NGridItem className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            {t("landing.transparency.eyebrow")}
          </p>
          <h2
            className="mt-2 font-serif text-3xl font-semibold tracking-tight text-foreground sm:text-4xl"
            id="landing-transparency-title"
          >
            {t("landing.transparency.headingLead")}{" "}
            <span className="text-warning">
              {t("landing.transparency.headingAccent")}
            </span>
          </h2>
          <div aria-hidden className="mt-3 h-1 w-12 rounded-full bg-primary" />
          <p className="mt-3 max-w-xl text-base leading-7 text-muted-foreground">
            {t("landing.transparency.description")}
          </p>

          <ul className="mt-7 space-y-5">
            {LANDING_TRANSPARENCY_BENEFITS.map((benefit) => {
              const Icon = benefit.icon;

              return (
                <li className="flex items-start gap-4" key={benefit.id}>
                  <span className="grid size-12 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                    <Icon aria-hidden className="size-5" />
                  </span>
                  <div className="min-w-0 pt-0.5">
                    <h3 className="text-sm font-semibold text-foreground">
                      {t(benefit.titleKey)}
                    </h3>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      {t(benefit.textKey)}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>

          <NButton asChild className="mt-7" variant="outline">
            <Link href={`#${LANDING_ANCHORS.illustrativeOrder}`}>
              {t("landing.transparency.action")}
              <ArrowRight aria-hidden className="size-4 rtl:rotate-180" />
            </Link>
          </NButton>
        </NGridItem>
        <NGridItem className="min-w-0">
          <ExampleOrderCard />
        </NGridItem>
      </NGrid>
    </section>
  );
}
