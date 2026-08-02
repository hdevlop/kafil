"use client";

import { CalendarClock, HandHeart, Hash, House, Timer } from "lucide-react";
import { NCard, NCardAction, NCardInfo, NCardSection } from "najm-kit";
import type { ReactNode } from "react";

import { formatDateTime, formatKafilDate, formatMad } from "@/lib/format";
import { useKafilLanguage } from "@/i18n/KafilLanguageProvider";
import { StatusBadge } from "@/shared/StatusBadge";

export interface ContributionCardData {
  amountMinor: number;
  paymentMethod?: string;
  status: string;
  externalReference?: string | null;
  sponsorName?: string;
  familyName?: string;
  supportLabel?: string;
  submittedAt: string;
  expiresAt?: string | null;
  expiredAt?: string | null;
}

export function ContributionCard({
  data,
  actions,
  familySafe = false,
}: Readonly<{ data: ContributionCardData; actions?: ReactNode; familySafe?: boolean }>) {
  const { t } = useKafilLanguage();
  const isPending = data.status === "pending";
  return (
    <NCard
      embedded
      title={formatMad(data.amountMinor)}
      description={familySafe ? data.externalReference || undefined : data.paymentMethod}
    >
      <NCardAction>
        <div className="flex flex-wrap items-center justify-end gap-1">
          <StatusBadge status={data.status} />
          {actions}
        </div>
      </NCardAction>
      <NCardSection>
        {data.externalReference ? (
          <NCardInfo
            icon={Hash}
            label={t("operator.contributions.externalReference")}
            value={data.externalReference}
          />
        ) : null}
        {data.sponsorName ? (
          <NCardInfo
            icon={HandHeart}
            label={t("operator.assignments.sponsor")}
            value={data.sponsorName}
          />
        ) : null}
        {data.familyName || data.supportLabel ? (
          <NCardInfo
            icon={House}
            label={t("operator.assignments.family")}
            value={data.familyName ?? data.supportLabel}
          />
        ) : null}
        <NCardInfo
          icon={CalendarClock}
          label={t("operator.contributions.submitted")}
          value={formatKafilDate(data.submittedAt)}
        />
        {isPending && data.expiresAt ? (
          <NCardInfo
            icon={Timer}
            label={t("operator.contributions.pendingDeadline")}
            value={formatDateTime(data.expiresAt)}
          />
        ) : null}
        {data.status === "expired" && data.expiredAt ? (
          <NCardInfo
            icon={Timer}
            label={t("operator.contributions.expiredAt")}
            value={formatDateTime(data.expiredAt)}
          />
        ) : null}
      </NCardSection>
    </NCard>
  );
}
