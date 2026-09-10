"use client";

import { ReceiptText } from "lucide-react";
import { NBadge, NCard, useNajmFormat } from "najm-kit";
import { NNextImage } from "najm-kit/next";
import { useTranslation } from "najm-i18n/react";

import { LANDING_ANCHORS } from "../config/landingContent";
import { LANDING_SECTION_ASSETS } from "../config/landingSectionAssets";
import {
  LANDING_SAMPLE_ORDER_STATUSES,
  LANDING_SAMPLE_ORDER_TOTAL_MINOR,
  LANDING_SAMPLE_PRODUCTS,
} from "../config/landingSectionContent";

export function ExampleOrderCard() {
  const { t } = useTranslation();
  const fmt = useNajmFormat();

  return (
    <NCard bordered noPadding className="bg-card shadow-lg shadow-foreground/5">
      <div className="px-4 py-3 sm:px-5 sm:py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
              <ReceiptText aria-hidden className="size-4" />
            </span>
            <h3
              className="scroll-mt-24 text-base font-semibold text-foreground"
              id={LANDING_ANCHORS.illustrativeOrder}
              tabIndex={-1}
            >
              {t("landing.sampleOrder.title")}
            </h3>
          </div>
          <NBadge color="primary" look="soft" size="sm">
            {t("landing.sampleOrder.badge")}
          </NBadge>
        </div>

        <ul className="mt-3 space-y-1">
          {LANDING_SAMPLE_PRODUCTS.map((product) => {
            const asset = LANDING_SECTION_ASSETS[product.assetKey];

            return (
              <li
                className="flex min-w-0 items-center gap-3 px-1 py-2"
                key={product.id}
              >
                <div className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-lg bg-muted/40">
                  <NNextImage unoptimized
                    alt=""
                    className="size-full object-contain p-1"
                    fallbackSrc={asset.src}
                    height={asset.height}
                    loading="lazy"
                    sizes="64px"
                    src={asset.src}
                    width={asset.width}
                  />
                </div>
                <span className="min-w-0 flex-1 text-sm font-medium text-foreground">
                  {t(product.nameKey)}
                </span>
                <strong className="shrink-0 text-sm text-foreground" dir="auto">
                  {fmt.money(product.amountMinor)}
                </strong>
              </li>
            );
          })}
        </ul>

        <div className="mt-3 flex items-center justify-between gap-4 border-t border-border pt-3">
          <span className="text-sm text-muted-foreground">
            {t("landing.sampleOrder.total")}
          </span>
          <strong className="text-lg text-primary" dir="auto">
            {fmt.money(LANDING_SAMPLE_ORDER_TOTAL_MINOR)}
          </strong>
        </div>

        <ol className="mt-4 flex list-none items-start">
          {LANDING_SAMPLE_ORDER_STATUSES.map((status, index) => {
            const Icon = status.icon;

            return (
              <li
                className="relative flex min-w-0 flex-1 flex-col items-center text-center"
                key={status.id}
              >
                <span className="relative z-10 grid size-8 place-items-center rounded-full bg-primary text-primary-foreground">
                  <Icon aria-hidden className="size-4" />
                </span>
                <span className="mt-2 text-xs font-medium text-foreground">
                  {t(status.labelKey)}
                </span>
                {index < LANDING_SAMPLE_ORDER_STATUSES.length - 1 ? (
                  <span
                    aria-hidden
                    className="absolute start-[calc(50%+1rem)] top-4 h-px w-[calc(100%-2rem)] bg-primary/60"
                  />
                ) : null}
              </li>
            );
          })}
        </ol>
      </div>
    </NCard>
  );
}
