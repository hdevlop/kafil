"use client";

import { NGrid, NGridItem } from "najm-kit";
import { useNajmFormat } from "najm-kit";
import { useTranslation } from "najm-i18n/react";

import { LANDING_ANCHORS } from "../config/landingContent";
import { buildLandingFamilyViewModels } from "../lib/buildLandingViewModel";
import { LandingFamilyExampleCard } from "./LandingFamilyExampleCard";

export function LandingFamilyExamples() {
  const { t } = useTranslation();
  const fmt = useNajmFormat();
  const models = buildLandingFamilyViewModels({ t, money: fmt.money });

  return (
    <section aria-labelledby="landing-families-title" id={LANDING_ANCHORS.families} className="mx-auto w-full min-w-0 max-w-6xl scroll-mt-24 px-4 pb-4 sm:px-6 ">
      <div>
        <h2 id="landing-families-title" className="font-serif text-3xl font-semibold tracking-tight text-foreground">
          {t("landing.families.title")}
        </h2>
        <div aria-hidden="true" className="mt-2 h-1 w-12 rounded-full bg-primary" />
        <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
          {t("landing.families.subtitle")}
        </p>
      </div>
      <p
        role="note"
        aria-label={t("landing.families.disclosureTitle")}
        className="mt-3 text-xs leading-5 text-muted-foreground"
      >
        <span className="font-medium text-foreground">
          {t("landing.families.disclosureTitle")}: {" "}
        </span>
        {t("landing.families.disclosureText")}
      </p>
      <NGrid cols={1} smCols={2} lgCols={4} className="mt-5">
        {models.map((model) => (
          <NGridItem key={model.id} span={1} className="min-w-0">
            <LandingFamilyExampleCard model={model} />
          </NGridItem>
        ))}
      </NGrid>
    </section>
  );
}
