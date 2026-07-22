"use client";

import { CalendarDays, CircleDollarSign, House, Mail, Phone } from "lucide-react";
import {
  NAvatar,
  NCard,
  NCardAction,
  NCardInfo,
  NCardMedia,
  NCardSection,
} from "najm-kit";

import { useKafilLanguage } from "@/i18n/KafilLanguageProvider";
import { formatKafilDate, formatMad } from "@/lib/format";
import { getSponsorAvatarImage } from "@/lib/personImages";
import { StatusBadge } from "@/shared/StatusBadge";

import type { SupportAssignmentView } from "../types";

export function SupportAssignmentCard({ data }: Readonly<{ data: SupportAssignmentView }>) {
  const { language, t } = useKafilLanguage();
  return (
    <NCard
      embedded
      title={data.sponsorLabel}
      description={data.familyLabel}
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
        <NCardInfo icon={Mail} label={t("operator.sponsors.email")} value={data.sponsorEmail ?? t("operator.sponsors.notProvided")} maxChars={30} />
        <NCardInfo icon={Phone} label={t("operator.sponsors.phone")} value={data.sponsorPhone ?? t("operator.sponsors.notProvided")} maxChars={30} />
        <NCardInfo icon={House} label={t("operator.assignments.family")} value={data.familyLabel} />
        <NCardInfo icon={CircleDollarSign} label={t("sponsor.contributions.amount")} value={formatMad(data.sponsorshipPriceMinor, language)} />
        <NCardInfo icon={CalendarDays} label={t("operator.assignments.started")} value={formatKafilDate(data.startedAt, language)} />
      </NCardSection>
    </NCard>
  );
}
