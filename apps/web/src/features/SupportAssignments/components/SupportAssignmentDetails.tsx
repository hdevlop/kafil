"use client";

import { NotebookPen, UserRoundCheck } from "lucide-react";
import { NAvatar, NDetailList, NSection } from "najm-kit";

import { useKafilLanguage } from "@/i18n/KafilLanguageProvider";
import { formatKafilDate, formatMad } from "@/lib/format";
import { getSponsorAvatarImage } from "@/lib/personImages";
import { StatusBadge } from "@/shared/StatusBadge";

import type { SupportAssignmentView } from "../types";

export function SupportAssignmentDetails({
  assignment,
}: Readonly<{ assignment: SupportAssignmentView }>) {
  const { language, t } = useKafilLanguage();
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4 rounded-2xl bg-muted/60 p-4">
        <NAvatar
          src={getSponsorAvatarImage(
            assignment.sponsorImage,
            assignment.sponsorGender,
          )}
          title={assignment.sponsorLabel}
          size="xl"
          classNames={{ avatar: "bg-muted" }}
        />
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold">{assignment.sponsorLabel}</p>
          <p className="truncate text-sm text-muted-foreground">
            {assignment.familyLabel}
          </p>
          <StatusBadge className="mt-2" status={assignment.status} />
        </div>
      </div>

      <NSection icon={UserRoundCheck} title={t("operator.assignments.target")}>
        <NDetailList
          items={[
            { label: t("operator.assignments.sponsor"), value: assignment.sponsorLabel },
            { label: t("operator.sponsors.email"), value: assignment.sponsorEmail ?? t("operator.sponsors.notProvided") },
            { label: t("operator.sponsors.phone"), value: assignment.sponsorPhone ?? t("operator.sponsors.notProvided") },
            { label: t("operator.assignments.family"), value: assignment.familyLabel },
            { label: t("sponsor.contributions.amount"), value: formatMad(assignment.sponsorshipPriceMinor, language) },
            { label: t("operator.assignments.started"), value: formatKafilDate(assignment.startedAt, language) },
            { label: t("operator.assignments.ended"), value: formatKafilDate(assignment.endedAt, language) },
          ]}
        />
      </NSection>

      <NSection icon={NotebookPen} title={t("operator.assignments.operatorNotes")}>
        <NDetailList
          items={[{ label: t("operator.assignments.notes"), value: assignment.notes || t("operator.assignments.noOperatorNotes") }]}
        />
      </NSection>
    </div>
  );
}
