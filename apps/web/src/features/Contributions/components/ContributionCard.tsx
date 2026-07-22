"use client";

import { CalendarClock, HandHeart, Hash, House } from "lucide-react";
import { NCard, NCardAction, NCardInfo, NCardSection } from "najm-kit";

import { formatKafilDate, formatMad } from "@/lib/format";
import { useKafilLanguage } from "@/i18n/KafilLanguageProvider";
import { StatusBadge } from "@/shared/StatusBadge";

import type { ContributionRecord } from "../types";

export function ContributionCard({
  data,
}: Readonly<{ data: ContributionRecord }>) {
  const { t } = useKafilLanguage();
  return (
    <NCard
      embedded
      title={formatMad(data.amountMinor)}
      description={data.paymentMethod}
    >
      <NCardAction>
        <StatusBadge status={data.status} />
      </NCardAction>
      <NCardSection>
        <NCardInfo
          icon={Hash}
          label={t("operator.contributions.externalReference")}
          value={data.externalReference || t("operator.contributions.notProvided")}
        />
        <NCardInfo
          icon={HandHeart}
          label={t("operator.assignments.sponsor")}
          value={data.sponsorName}
        />
        <NCardInfo
          icon={House}
          label={t("operator.assignments.family")}
          value={data.familyName}
        />
        <NCardInfo
          icon={CalendarClock}
          label={t("operator.contributions.submitted")}
          value={formatKafilDate(data.submittedAt)}
        />
      </NCardSection>
    </NCard>
  );
}
