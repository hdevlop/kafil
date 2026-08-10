"use client";

import { CalendarClock, Mail, Phone } from "lucide-react";
import {
  NAvatar,
  NBadge,
  NCard,
  NCardInfo,
  NCardMedia,
  NCardSection,
} from "najm-kit";
import { getPersonImage } from "najm-kit/person-images";

import { useKafilLanguage } from "@/i18n/useKafilLanguage";
import { useNajmFormat } from "najm-kit";

import type { ApplicantRecord } from "../types";

export function ApplicantCard({ data }: Readonly<{ data: ApplicantRecord }>) {
  const { t } = useKafilLanguage();
  const fmt = useNajmFormat();

  return (
    <NCard
      embedded
      title={data.name}
      description={
        <NBadge
          label={t(`operator.applicants.statusLabel.${data.status}`)}
          size="sm"
          status={data.status}
        />
      }
      className="w-full overflow-hidden transition-colors"
      classNames={{
        title: "text-base font-semibold text-foreground",
        description: "mt-1 flex",
      }}
    >
      <NCardMedia
        variant="avatar"
        size="sm"
        className="w-20 sm:w-[var(--n-card-media-size)]"
      >
        <NAvatar
          src={getPersonImage({ image: null, role: "adult", gender: data.gender })}
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
          value={fmt.date(data.submittedAt)}
        />
      </NCardSection>
    </NCard>
  );
}
