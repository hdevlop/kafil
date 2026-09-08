"use client";

import Link from "next/link";
import { MapPin, ShoppingBag, Users } from "lucide-react";
import { NBadge, NButton, NCard, NCardAction, NCardInfo, NCardMedia, NCardSection } from "najm-kit";
import { NNextImage } from "najm-kit/next";
import { useTranslation } from "najm-i18n/react";

import { LANDING_ROUTES } from "../config/landingContent";
import { getLandingFamilyFallbackImage, type LandingFamilyCardViewModel } from "../lib/buildLandingViewModel";

export function LandingFamilyExampleCard({ model }: Readonly<{ model: LandingFamilyCardViewModel }>) {
  const { t } = useTranslation();

  return (
    <NCard
      title={model.name}
      description={
        <span className="flex items-center gap-1">
          <MapPin aria-hidden="true" className="size-3.5 shrink-0" />
          {model.city}
        </span>
      }
    >
      <NCardMedia variant="image" size={116}>
        <NNextImage
          src={model.imageSrc}
          fallbackSrc={getLandingFamilyFallbackImage()}
          alt={model.imageAlt}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1280px) 33vw, 25vw"
          className="object-cover"
        />
      </NCardMedia>
      <NCardAction>
        <NBadge color="neutral">{t("landing.families.exampleBadge")}</NBadge>
      </NCardAction>
      <NCardSection density="responsive" surface="responsive">
        <NCardInfo icon={Users} label={t("landing.families.membersLabel")} value={model.membersText} />
        <NCardInfo
          icon={ShoppingBag}
          label={t("landing.families.needLabel")}
          value={model.needText}
          valueClassName="text-xs sm:text-sm"
        />
      </NCardSection>
      <div className="px-3 pb-3 sm:px-4 sm:pb-4">
        <NButton asChild variant="outline" size="sm" className="w-full">
          <Link href={LANDING_ROUTES.apply}>{t("landing.families.applyCta")}</Link>
        </NButton>
      </div>
    </NCard>
  );
}
