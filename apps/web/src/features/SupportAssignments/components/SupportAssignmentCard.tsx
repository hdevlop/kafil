"use client";

import { CalendarDays, House } from "lucide-react";
import { NCard, NCardInfo, NCardMedia, NCardSection, cn } from "najm-kit";

import { useKafilLanguage } from "@/i18n/useKafilLanguage";
import { formatKafilDate, formatStatusLabel } from "@/lib/format";
import { getSponsorAvatarImage } from "@/lib/personImages";
import { ManagedAvatar } from "@/shared/ManagedAvatar";

import type { SupportAssignmentView } from "../types";

export function SupportAssignmentCard({ data }: Readonly<{ data: SupportAssignmentView }>) {
  const { language, t } = useKafilLanguage();
  const isInactive = data.status !== "active";
  return (
    <NCard
      embedded
      title={data.sponsorLabel}
      className={cn(
        isInactive && "bg-muted/60 text-muted-foreground opacity-60 grayscale",
      )}
    >
      <NCardMedia variant="avatar" size="sm">
        <ManagedAvatar
          src={getSponsorAvatarImage(data.sponsorImage, data.sponsorGender)}
          alt={data.sponsorLabel}
          size="xl"
          classNames={{ avatar: "bg-muted" }}
        />
      </NCardMedia>
      <NCardSection>
        <span className="sr-only">
          {t("operator.assignments.status")}: {formatStatusLabel(data.status, language)}
        </span>
        <NCardInfo icon={House} label={t("operator.assignments.family")} value={data.familyLabel} />
        <NCardInfo icon={CalendarDays} label={t("operator.assignments.started")} value={formatKafilDate(data.startedAt, language)} />
      </NCardSection>
    </NCard>
  );
}
