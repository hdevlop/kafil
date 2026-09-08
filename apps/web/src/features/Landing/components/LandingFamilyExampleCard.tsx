"use client";

import Link from "next/link";
import { BadgeCheck, HeartHandshake, MapPin, ShoppingBag, Users } from "lucide-react";
import { NBadge, NButton, NCardInfo, NCardSection } from "najm-kit";
import { useTranslation } from "najm-i18n/react";

import { FamilyCardFrame } from "@/features/Families/components/FamilyCard";
import { LANDING_ROUTES } from "../config/landingContent";
import { getLandingFamilyFallbackImage, type LandingFamilyCardViewModel } from "../lib/buildLandingViewModel";

export function LandingFamilyExampleCard({ model }: Readonly<{ model: LandingFamilyCardViewModel }>) {
  const { t } = useTranslation();

  return (
    <FamilyCardFrame
      title={
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="truncate">{model.name}</span>
          {model.status === "active" ? (
            <BadgeCheck
              aria-hidden
              className="size-4 shrink-0 fill-primary text-primary-foreground"
            />
          ) : null}
        </span>
      }
      imageSrc={model.imageSrc}
      imageFallbackSrc={getLandingFamilyFallbackImage()}
      imageAlt={model.imageAlt}
      imageSizes="(max-width: 768px) 100vw, (max-width: 1280px) 33vw, 25vw"
      bordered
      headerAction={
        <NBadge status={model.status} />
      }
      footer={
        <NButton asChild className="w-full">
          <Link href={LANDING_ROUTES.apply}>
            <HeartHandshake aria-hidden="true" className="size-4" />
            {t("landing.families.applyCta")}
          </Link>
        </NButton>
      }
    >
      <NCardSection density="responsive" surface="responsive">
        <NCardInfo icon={MapPin} value={model.city} />
        <NCardInfo icon={Users} label={t("landing.families.membersLabel")} value={model.membersText} />
        <NCardInfo
          icon={ShoppingBag}
          label={t("landing.families.needLabel")}
          value={model.needText}
          valueClassName="text-xs sm:text-sm"
        />
      </NCardSection>
    </FamilyCardFrame>
  );
}
