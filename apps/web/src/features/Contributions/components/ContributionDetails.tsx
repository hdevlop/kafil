"use client";

import { useEffect, useState } from "react";
import { CreditCard, ReceiptText } from "lucide-react";
import {
  NAvatar,
  NBadge,
  NCard,
  NCardAction,
  NCardInfo,
  NCardMedia,
  NCardSection,
  NDetailList,
  NSheet,
  useNajmFormat,
} from "najm-kit";

import { getPersonImage } from "najm-kit/person-images";
import { useTranslation } from "najm-i18n/react";
import { NNextImage } from "najm-kit/next";
import { useKafilRole } from "@/shared/Authorization";

import type { ContributionListRecord, ContributionRecord } from "../types";

function isManagement(record: ContributionListRecord): record is ContributionRecord {
  return "paymentMethod" in record && "familyName" in record;
}

export function ContributionDetailsSheet({
  contribution,
  open,
  onOpenChange,
}: Readonly<{
  contribution: ContributionListRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}>) {
  const { language, t } = useTranslation();
  const { isExactSponsor } = useKafilRole();
  const management = contribution ? isManagement(contribution) : false;
  const viewTitleKey = management
    ? "operator.contributions.viewTitle"
    : isExactSponsor
      ? "sponsor.contributions.viewTitle"
      : "family.contributions.viewTitle";
  const viewDescKey = management
    ? "operator.contributions.viewDescription"
    : isExactSponsor
      ? "sponsor.contributions.viewDescription"
      : "family.contributions.viewDescription";

  return (
    <NSheet
      open={open}
      onOpenChange={onOpenChange}
      icon={ReceiptText}
      title={t(viewTitleKey)}
      description={t(viewDescKey)}
      width={480}
      side={language === "ar" ? "left" : "right"}
      classNames={{
        content: "max-w-full bg-background",
        header: "bg-background",
        body: "bg-background",
      }}
    >
      {contribution ? <ContributionDetails contribution={contribution} /> : null}
    </NSheet>
  );
}

export function ContributionDetails({ contribution }: Readonly<{ contribution: ContributionListRecord }>) {
  const { t } = useTranslation();
  const fmt = useNajmFormat();
  const { isExactSponsor } = useKafilRole();
  const [nowMs, setNowMs] = useState<number | null>(null);

  useEffect(() => {
    const updateNow = () => setNowMs(Date.now());
    updateNow();
    const interval = window.setInterval(updateNow, 30_000);
    return () => window.clearInterval(interval);
  }, []);

  const management = isManagement(contribution);
  const isPending = contribution.status === "pending";
  const isExpired = contribution.status === "expired" ||
    (isPending && Boolean(contribution.expiresAt) && nowMs !== null && new Date(contribution.expiresAt!).getTime() <= nowMs);
  const visibleStatus = isExpired && isPending ? "expired" : contribution.status;
  const sponsorName =
    "sponsorName" in contribution ? contribution.sponsorName : t("common.you");
  const sponsorImage =
    "sponsorImage" in contribution ? contribution.sponsorImage : null;
  const sponsorGender =
    "sponsorGender" in contribution ? contribution.sponsorGender : null;
  const paymentItems = [
    ...(management ? [{
      label: t("operator.contributions.paymentMethod"),
      value: contribution.paymentMethod,
    }] : []),
    ...(contribution.externalReference ? [{
      label: t("operator.contributions.externalReference"),
      value: contribution.externalReference,
    }] : []),
    {
      label: t("operator.contributions.submitted"),
      value: fmt.date(contribution.submittedAt),
    },
    ...(contribution.paidAt ? [{
      label: t("operator.contributions.paid"),
      value: fmt.date(contribution.paidAt),
    }] : []),
    ...(contribution.validatedAt ? [{
      label: t("operator.contributions.validated"),
      value: fmt.date(contribution.validatedAt),
    }] : []),
    ...(contribution.rejectedAt ? [{
      label: t("operator.contributions.rejected"),
      value: fmt.date(contribution.rejectedAt),
    }] : []),
    ...(contribution.expiredAt ? [{
      label: t("operator.contributions.expiredAt"),
      value: fmt.date(contribution.expiredAt),
    }] : []),
    ...(management && "rejectionReason" in contribution && contribution.rejectionReason ? [{
      label: t("operator.contributions.rejectionReason"),
      value: contribution.rejectionReason,
    }] : []),
    ...(isPending && contribution.expiresAt ? [{
      label: t("operator.contributions.pendingDeadline"),
      value: isExpired
        ? `${fmt.dateTime(contribution.expiresAt)} (${t("operator.contributions.expired")})`
        : fmt.dateTime(contribution.expiresAt),
    }] : []),
  ];

  return (
    <div className="space-y-4">
      <NCard
        title={isExactSponsor ? t("common.you") : sponsorName}
        description={
          management && "sponsorEmail" in contribution
            ? contribution.sponsorEmail
            : undefined
        }
      >
        <NCardMedia variant="avatar" placement="header" size="sm">
          <NAvatar
            src={getPersonImage({ image: sponsorImage, role: "adult", gender: sponsorGender })}
            alt={sponsorName}
            size="xl"
            classNames={{ avatar: "bg-muted" }}
          />
        </NCardMedia>
        <NCardAction>
          <NBadge status={visibleStatus} />
        </NCardAction>
        <NCardSection density="responsive" surface="responsive">
          <NCardInfo
            icon={CreditCard}
            label={t("operator.contributions.amount")}
            value={fmt.money(contribution.amountMinor)}
            valueClassName="text-lg font-semibold text-foreground"
          />
        </NCardSection>
      </NCard>

      {management && "familyName" in contribution ? (
        <NCard
          title={contribution.familyName}
          description={t("operator.contributions.budgetDestination")}
          classNames={{ media: "w-full" }}
        >
          <NCardMedia variant="hero" placement="top" aspect="16/9">
            <NNextImage unoptimized
              src={getPersonImage({ image: contribution.familyImage, role: "family" })}
              fallbackSrc={getPersonImage({ image: null, role: "family" })}
              alt={contribution.familyName}
              fill
              sizes="(max-width: 640px) 100vw, 480px"
              className="object-cover"
            />
          </NCardMedia>
        </NCard>
      ) : null}

      <NCard icon={ReceiptText} title={t("operator.contributions.paymentRecord")}>
        <NDetailList items={paymentItems} />
      </NCard>

      {isExpired ? (
        <p className="rounded-md bg-warning/10 px-3 py-2 text-sm text-warning">
          {t("operator.contributions.expiredWarning")}
        </p>
      ) : null}
    </div>
  );
}
