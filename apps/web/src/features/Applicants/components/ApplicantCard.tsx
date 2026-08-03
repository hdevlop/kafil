"use client";

import { CalendarClock, Mail, Phone } from "lucide-react";
import { NCard, NCardInfo, NCardMedia, NCardSection } from "najm-kit";

import { useKafilLanguage } from "@/i18n/KafilLanguageProvider";
import { formatKafilDate } from "@/lib/format";
import { getSponsorPersonImage } from "@/lib/personImages";
import { ManagedAvatar } from "@/shared/ManagedAvatar";

import type { ApplicantRecord } from "../types";

export function ApplicantCard({ data }: Readonly<{ data: ApplicantRecord }>) {
  const { language, t } = useKafilLanguage();

  return (
    <NCard
      embedded
      title={data.name}
      description={t(`operator.applicants.statusLabel.${data.status}`)}
      className="w-full overflow-hidden transition-colors"
      classNames={{
        title: "text-base font-semibold text-foreground",
        description: "hidden sm:block",
        header: "[&>div:last-child]:hidden sm:[&>div:last-child]:flex",
      }}
    >
      <NCardMedia
        variant="avatar"
        size="sm"
        className="w-20 sm:w-[var(--n-card-media-size)]"
      >
        <ManagedAvatar
          src={getSponsorPersonImage(data.gender)}
          alt={data.name}
          size="xl"
          classNames={{ avatar: "size-20 bg-muted sm:size-16" }}
        />
      </NCardMedia>
      <NCardSection density="responsive" surface="responsive">
        <NCardInfo
          icon={Mail}
          label={t("operator.applicants.email")}
          value={data.email}
          maxChars={30}
        />
        <NCardInfo
          icon={Phone}
          label={t("operator.applicants.phone")}
          value={data.phone}
          maxChars={24}
        />
        <NCardInfo
          icon={CalendarClock}
          label={t("operator.applicants.submitted")}
          value={formatKafilDate(data.submittedAt, language)}
        />
      </NCardSection>
    </NCard>
  );
}
