"use client";

import { NGrid, NGridItem, NStatCard } from "najm-kit";
import { useTranslation } from "najm-i18n/react";

import { LANDING_ANCHORS, LANDING_TRUST_ITEMS } from "../config/landingContent";

export function LandingTrustStrip() {
  const { t } = useTranslation();

  return (
    <section
      aria-labelledby="landing-trust-title"
      id={LANDING_ANCHORS.howItWorks}
      className="mx-auto w-full min-w-0 max-w-6xl scroll-mt-24 px-4 pb-8 sm:px-6"
    >
      <h2 id="landing-trust-title" className="sr-only">
          {t("landing.trust.title")}
      </h2>
      <div className="overflow-hidden rounded-2xl border border-border bg-card px-2 py-2 shadow-sm">
        <NGrid cols={1} smCols={2} lgCols={5} className="gap-0">
          {LANDING_TRUST_ITEMS.map((item) => (
            <NGridItem key={item.key} span={1} className="min-w-0">
              <NStatCard
                className="h-full rounded-none border-0 bg-transparent shadow-none"
                classNames={{ value: "text-sm leading-snug", description: "text-xs leading-5" }}
                icon={item.icon}
                value={t(item.titleKey)}
                subtext={t(item.textKey)}
              />
            </NGridItem>
          ))}
        </NGrid>
      </div>
    </section>
  );
}
