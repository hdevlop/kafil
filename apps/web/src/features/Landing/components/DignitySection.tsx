"use client";

import { NGrid, NGridItem } from "najm-kit";
import { NNextImage } from "najm-kit/next";
import { useTranslation } from "najm-i18n/react";

import { LANDING_ANCHORS } from "../config/landingContent";
import { LANDING_SECTION_ASSETS } from "../config/landingSectionAssets";
import { LANDING_DIGNITY_BENEFITS } from "../config/landingSectionContent";

export function DignitySection() {
  const { t } = useTranslation();
  const image = LANDING_SECTION_ASSETS.dignityFamily;

  return (
    <section
      aria-labelledby="landing-dignity-title"
      className="scroll-mt-24 bg-muted/40"
      id={LANDING_ANCHORS.commitment}
      style={{ marginInline: "calc(var(--najm-page-gutter, 0px) * -1)" }}
    >
      <div className="mx-auto w-full min-w-0 max-w-6xl px-4 py-10 sm:px-6 sm:py-14 lg:py-16">
        <NGrid
          cols={1}
          gap="clamp(2rem, 5vw, 3.5rem)"
          lgCols={2}
          className="items-center"
        >
          <NGridItem className="min-w-0">
            <div className="overflow-hidden rounded-2xl bg-background/40">
              <NNextImage unoptimized
                alt={image.altKey ? t(image.altKey) : ""}
                className="h-auto max-h-[30rem] w-full object-contain"
                fallbackSrc={image.src}
                height={image.height}
                loading="lazy"
                sizes="(max-width: 1024px) 100vw, 50vw"
                src={image.src}
                width={image.width}
              />
            </div>
          </NGridItem>
          <NGridItem className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              {t("landing.dignity.eyebrow")}
            </p>
            <h2
              className="mt-2 font-serif text-3xl font-semibold tracking-tight text-foreground sm:text-4xl"
              id="landing-dignity-title"
            >
              {t("landing.dignity.headingLead")}{" "}
              <span className="text-warning">
                {t("landing.dignity.headingAccent")}
              </span>
            </h2>
            <div aria-hidden className="mt-3 h-1 w-12 rounded-full bg-primary" />

            <ul className="mt-7 space-y-5">
              {LANDING_DIGNITY_BENEFITS.map((benefit) => {
                const Icon = benefit.icon;

                return (
                  <li className="flex items-start gap-4" key={benefit.id}>
                    <span className="grid size-12 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                      <Icon aria-hidden className="size-6" strokeWidth={1.8} />
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
          </NGridItem>
        </NGrid>
      </div>
    </section>
  );
}
