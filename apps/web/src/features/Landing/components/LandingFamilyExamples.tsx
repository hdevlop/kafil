"use client";

import { NBadge, NGrid, NGridItem } from "najm-kit";
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
    <section aria-labelledby="landing-families-title" id={LANDING_ANCHORS.families} className="mx-auto w-full min-w-0 max-w-6xl scroll-mt-24 px-4 pb-8 sm:px-6 lg:pb-10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 id="landing-families-title" className="font-serif text-3xl font-semibold tracking-tight text-foreground">
            {t("landing.families.title")}
          </h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{t("landing.families.subtitle")}</p>
        </div>
        <NBadge color="neutral">{t("landing.families.disclosureTitle")}</NBadge>
      </div>
      <p role="note" aria-label={t("landing.families.disclosureTitle")} className="mt-3 text-xs leading-5 text-muted-foreground">
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
