"use client";

import { CalendarDays, House } from "lucide-react";
import { NCard, NCardInfo, NCardMedia, NCardSection, cn, useNajmFormat } from "najm-kit";
import { getPersonImage } from "najm-kit/person-images";

import { formatStatusLabel } from "@/features/StatusLabels";
import { useKafilLanguage } from "@/i18n/useKafilLanguage";
import { ManagedAvatar } from "@/shared/ManagedAvatar";

import type { SupportAssignmentView } from "../types";

export function SupportAssignmentCard({ data }: Readonly<{ data: SupportAssignmentView }>) {
  const { language, t } = useKafilLanguage();
  const fmt = useNajmFormat();
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
          src={getPersonImage({ image: data.sponsorImage, role: "adult", gender: data.sponsorGender })}
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
        <NCardInfo icon={CalendarDays} label={t("operator.assignments.started")} value={fmt.date(data.startedAt)} />
      </NCardSection>
    </NCard>
  );
}
