"use client";

import { CalendarDays, House } from "lucide-react";
import {
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

import type { SupportAssignmentView } from "../types";

export function SupportAssignmentCard({ data }: Readonly<{ data: SupportAssignmentView }>) {
  const { language, t } = useKafilLanguage();
  return (
    <NCard
      embedded
      title={data.sponsorLabel}
    >
      <NCardMedia variant="avatar" size="sm">
        <NAvatar
          src={getSponsorAvatarImage(data.sponsorImage, data.sponsorGender)}
          alt={data.sponsorLabel}
          size="xl"
          classNames={{ avatar: "bg-muted" }}
        />
      </NCardMedia>
      <NCardAction>
        <StatusBadge status={data.status} />
      </NCardAction>
      <NCardSection>
        <NCardInfo icon={House} label={t("operator.assignments.family")} value={data.familyLabel} />
        <NCardInfo icon={CalendarDays} label={t("operator.assignments.started")} value={formatKafilDate(data.startedAt, language)} />
      </NCardSection>
    </NCard>
  );
}
