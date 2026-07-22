"use client";

import { CalendarClock, Hash, Phone, ReceiptText } from "lucide-react";
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

import type { BudgetLedgerEntry } from "../types";

export function BudgetLedgerCard({
  data,
}: Readonly<{ data: BudgetLedgerEntry }>) {
  const { language, t } = useKafilLanguage();
  const amount = formatMad(data.amountMinor, language);

  return (
    <NCard
      embedded
      title={data.sponsorName ?? amount}
      description={data.sponsorName ? amount : undefined}
    >
      <NCardAction>
        <p className="text-sm text-muted-foreground">
          {formatKafilDate(data.createdAt, language)}
        </p>
      </NCardAction>
      {data.sponsorName ? (
        <NCardMedia variant="avatar" size="sm">
          <NAvatar
            src={getSponsorAvatarImage(data.sponsorImage, data.sponsorGender)}
            alt={data.sponsorName}
            classNames={{ avatar: "bg-muted" }}
          />
        </NCardMedia>
      ) : null}
      <NCardSection>
        {data.sponsorPhone ? (
          <NCardInfo
            icon={Phone}
            label={t("operator.budgets.phone")}
            value={data.sponsorPhone}
          />
        ) : null}
        {data.paymentMethod ? (
          <NCardInfo
            icon={ReceiptText}
            label={t("operator.budgets.paymentMethod")}
            value={data.paymentMethod}
          />
        ) : null}
        {data.externalReference ? (
          <NCardInfo
            icon={Hash}
            label={t("operator.budgets.reference")}
            value={data.externalReference}
          />
        ) : null}
        {data.contributionStatus ? (
          <StatusBadge status={data.contributionStatus} />
        ) : null}
        <NCardInfo
          icon={CalendarClock}
          label={t("operator.budgets.source")}
          value={data.sourceType}
        />
      </NCardSection>
    </NCard>
  );
}
