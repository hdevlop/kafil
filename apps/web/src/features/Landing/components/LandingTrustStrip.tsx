"use client";

import { NGrid, NGridItem, NStatCard } from "najm-kit";
import { useTranslation } from "najm-i18n/react";

import { LANDING_TRUST_ITEMS } from "../config/landingContent";

export function LandingTrustStrip() {
  const { t } = useTranslation();

  return (
    <section
      aria-labelledby="landing-trust-title"
      className="mx-auto w-full min-w-0 max-w-6xl px-4 pb-4 sm:px-6"
    >
      <h2 id="landing-trust-title" className="sr-only">
          {t("landing.trust.title")}
      </h2>
      <div className="overflow-hidden rounded-2xl bg-card  py-2">
        <NGrid cols={1} smCols={2} lgCols={5} className="gap-0">
          {LANDING_TRUST_ITEMS.map((item) => (
            <NGridItem key={item.key} span={1} className="min-w-0">
              <NStatCard
                bordered={false}
                className="h-full rounded-none border-0 bg-transparent shadow-none"
                classNames={{
                  value: "truncate whitespace-nowrap text-xs font-medium leading-none lg:text-xs xl:text-xs 2xl:text-xs",
                  description: "truncate whitespace-nowrap text-[10px] leading-4",
                }}
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
