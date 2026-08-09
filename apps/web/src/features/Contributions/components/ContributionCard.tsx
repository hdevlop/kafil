"use client";

import { CalendarClock, CreditCard, House, Timer } from "lucide-react";
import { NCard, NCardInfo, NCardMedia, NCardSection, useNajmFormat } from "najm-kit";
import { getPersonImage } from "najm-kit/person-images";

import { useKafilLanguage } from "@/i18n/useKafilLanguage";
import { ManagedAvatar } from "@/shared/ManagedAvatar";
import { StatusBadge } from "@/shared/StatusBadge";
import { useKafilRole } from "@/shared/Authorization";

export interface ContributionCardData {
  amountMinor: number;
  paymentMethod?: string;
  status: string;
  externalReference?: string | null;
  sponsorName?: string;
  sponsorImage?: string | null;
  sponsorGender?: "F" | "M" | null;
  familyName?: string;
  supportLabel?: string;
  submittedAt: string;
  expiresAt?: string | null;
  expiredAt?: string | null;
}

export function ContributionCard({
  data,
}: Readonly<{ data: ContributionCardData }>) {
  const { t } = useKafilLanguage();
  const fmt = useNajmFormat();
  const { isExactSponsor } = useKafilRole();
  const isPending = data.status === "pending";
  return (
    <NCard
      embedded
      title={isExactSponsor ? t("common.you") : data.sponsorName}
      description={fmt.money(data.amountMinor)}
    >
      <NCardMedia variant="avatar" placement="header" size="sm">
        <ManagedAvatar
          src={getPersonImage({ image: data.sponsorImage ?? null, role: "adult", gender: data.sponsorGender ?? null })}
          alt={data.sponsorName ?? t("common.you")}
          size="xl"
          classNames={{ avatar: "bg-muted" }}
        />
      </NCardMedia>
      <NCardSection>
        {data.paymentMethod ? (
          <NCardInfo
            icon={CreditCard}
            label={t("operator.contributions.paymentMethod")}
            value={data.paymentMethod}
          />
        ) : null}
        {data.familyName ? (
          <NCardInfo
            icon={House}
            label={t("operator.assignments.family")}
            value={data.familyName}
          />
        ) : null}
        {isPending && data.expiresAt ? (
          <NCardInfo
            icon={Timer}
            label={t("operator.contributions.pendingDeadline")}
            value={fmt.dateTime(data.expiresAt)}
          />
        ) : null}
        {data.status === "expired" && data.expiredAt ? (
          <NCardInfo
            icon={Timer}
            label={t("operator.contributions.expiredAt")}
            value={fmt.dateTime(data.expiredAt)}
          />
        ) : null}
        <div className="flex min-w-0 items-center justify-between gap-3">
          <NCardInfo
            className="min-w-0 flex-1"
            icon={CalendarClock}
            label={t("operator.contributions.submitted")}
            value={fmt.date(data.submittedAt)}
          />
          <StatusBadge status={data.status} />
        </div>
      </NCardSection>
    </NCard>
  );
}
