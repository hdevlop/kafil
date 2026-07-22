"use client";

import { CalendarDays, Mail, Phone } from "lucide-react";
import {
  cn,
  NAvatar,
  NCard,
  NCardAction,
  NCardInfo,
  NCardMedia,
  NCardSection,
} from "najm-kit";

import { useKafilLanguage } from "@/i18n/KafilLanguageProvider";
import { formatKafilDate } from "@/lib/format";
import { getSponsorAvatarImage } from "@/lib/personImages";
import { StatusBadge } from "@/shared/StatusBadge";

import type { SponsorRecord } from "../types";

export function SponsorCard({ data }: Readonly<{ data: SponsorRecord }>) {
  const { language, t } = useKafilLanguage();
  const isInactive = data.status === "inactive";

  return (
    <NCard
      embedded
      title={data.name}
      description={
        data.gender === "F"
          ? t("operator.sponsors.female")
          : data.gender === "M"
            ? t("operator.sponsors.male")
            : undefined
      }
      classNames={{
        title: "text-base font-semibold text-foreground",
        description: "hidden sm:block",
        header: "[&>div:last-child]:hidden sm:[&>div:last-child]:flex",
      }}
      className={cn(
        "w-full overflow-hidden transition-colors",
        isInactive && "bg-muted/60 text-muted-foreground opacity-60 grayscale",
      )}
    >
      <NCardMedia
        variant="avatar"
        size="sm"
        className="w-20 sm:w-[var(--n-card-media-size)]"
      >
        <NAvatar
          src={getSponsorAvatarImage(data.image, data.gender)}
          alt={data.name}
          size="xl"
          classNames={{ avatar: "size-20 bg-muted sm:size-16" }}
        />
      </NCardMedia>
      <NCardAction>
        <StatusBadge status={data.status} />
      </NCardAction>
      <NCardSection density="responsive" surface="responsive">
        <NCardInfo
          icon={Mail}
          label={t("operator.sponsors.email")}
          value={data.email}
          maxChars={30}
        />
        <NCardInfo
          icon={Phone}
          label={t("operator.sponsors.phone")}
          value={data.phone || t("operator.sponsors.notProvided")}
          maxChars={30}
        />
        <NCardInfo
          icon={CalendarDays}
          label={t("operator.sponsors.dateOfBirth")}
          value={formatKafilDate(data.dateOfBirth, language)}
        />
      </NCardSection>
    </NCard>
  );
}
