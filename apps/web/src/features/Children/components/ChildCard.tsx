"use client";

import { CalendarDays, GraduationCap, UsersRound } from "lucide-react";
import {
  cn,
  NAvatar,
  NCard,
  NCardAction,
  NCardInfo,
  NCardMedia,
  NCardSection,
  SimpleTooltip,
} from "najm-kit";

import { formatKafilDate } from "@/lib/format";
import { getChildPersonImage } from "@/lib/personImages";
import { useKafilLanguage } from "@/i18n/KafilLanguageProvider";
import { StatusBadge } from "@/shared/StatusBadge";

import type { ChildRecord } from "../types";

export function ChildCard({ data }: Readonly<{ data: ChildRecord }>) {
  const { t } = useKafilLanguage();
  const isInactive = data.status === "inactive";
  const isFamilyUnavailable = data.familyStatus !== undefined && data.familyStatus !== "active";
  const isDisabled = isInactive || isFamilyUnavailable;
  const familyUnavailableMessage =
    data.familyStatus === null
      ? "This child's family account has been removed."
      : "This child's family account is inactive.";
  const guardianFirstName = data.guardianLegalName?.trim().split(/\s+/)[0];
  const familyName = guardianFirstName ? `${guardianFirstName} Family` : "Family";

  const card = (
    <NCard
      embedded
      title={data.legalName}
      description={data.gender === "F" ? t("operator.families.female") : t("operator.families.male")}
      classNames={{
        title: "text-base font-semibold text-foreground",
        description: "hidden sm:block",
        header: "[&>div:last-child]:hidden sm:[&>div:last-child]:flex",
      }}
      className={cn(
        "w-full overflow-hidden transition-colors",
        isDisabled && "bg-muted/60 text-muted-foreground opacity-60 grayscale",
      )}
    >
      <NCardMedia
        variant="avatar"
        size="sm"
        className="w-20 sm:w-[var(--n-card-media-size)]"
      >
        <NAvatar
          src={getChildPersonImage(data.gender)}
          alt={data.legalName}
          size="xl"
          classNames={{ avatar: "size-20 bg-muted sm:size-16" }}
        />
      </NCardMedia>
      <NCardAction>
        <StatusBadge status={data.status} />
      </NCardAction>
      <NCardSection density="responsive" surface="responsive">
        <NCardInfo
          icon={CalendarDays}
          label={t("operator.families.dateOfBirth")}
          value={formatKafilDate(data.dateOfBirth)}
        />
        <NCardInfo
          icon={GraduationCap}
          label={t("operator.families.schoolLevel")}
          value={data.schoolLevel || t("operator.families.notProvided")}
        />
        <NCardInfo
          icon={UsersRound}
          label={t("operator.families.profile")}
          value={familyName}
        />
      </NCardSection>
    </NCard>
  );

  if (!isFamilyUnavailable) return card;

  return (
    <SimpleTooltip content={familyUnavailableMessage} side="top">
      {card}
    </SimpleTooltip>
  );
}
