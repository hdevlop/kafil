"use client";

import {
  Banknote,
  CalendarClock,
  CalendarMinus,
  CircleUserRound,
  Mail,
  NotebookPen,
  Phone,
  UserRoundCheck,
  Users,
} from "lucide-react";
import {
  NAvatar,
  NBadge,
  NDetailList,
  type NDetailListItem,
  NSheet,
  useNajmFormat,
} from "najm-kit";
import { getPersonImage } from "najm-kit/person-images";

import { useKafilLanguage } from "@/i18n/useKafilLanguage";

import type { SupportAssignmentView } from "../types";

export function SupportAssignmentDetailsSheet({
  assignment,
  open,
  onOpenChange,
}: Readonly<{
  assignment: SupportAssignmentView | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}>) {
  const { language, t } = useKafilLanguage();
  return (
    <NSheet
      open={open}
      onOpenChange={onOpenChange}
      icon={UserRoundCheck}
      title={t("operator.assignments.viewTitle")}
      description={t("operator.assignments.viewDescription")}
      width={480}
      side={language === "ar" ? "left" : "right"}
      classNames={{
        content: "max-w-full bg-background",
        header: "bg-background",
        body: "bg-background",
      }}
    >
      {assignment ? <SupportAssignmentDetails assignment={assignment} /> : null}
    </NSheet>
  );
}

export function SupportAssignmentDetails({
  assignment,
}: Readonly<{ assignment: SupportAssignmentView }>) {
  const { t } = useKafilLanguage();
  const fmt = useNajmFormat();

  const detailItems: NDetailListItem[] = [
    {
      icon: CircleUserRound,
      label: t("operator.assignments.sponsor"),
      value: assignment.sponsorLabel,
    },
    {
      icon: Mail,
      label: t("operator.sponsors.email"),
      value: assignment.sponsorEmail ?? t("operator.sponsors.notProvided"),
    },
    {
      icon: Phone,
      label: t("operator.sponsors.phone"),
      value: assignment.sponsorPhone ?? t("operator.sponsors.notProvided"),
    },
    {
      icon: Users,
      label: t("operator.assignments.family"),
      value: assignment.familyLabel,
    },
    {
      icon: Banknote,
      label: t("sponsor.contributions.amount"),
      value: fmt.money(assignment.sponsorshipPriceMinor),
    },
    {
      icon: CalendarClock,
      label: t("operator.assignments.started"),
      value: fmt.date(assignment.startedAt),
    },
    {
      icon: CalendarMinus,
      label: t("operator.assignments.ended"),
      value: assignment.endedAt
        ? fmt.date(assignment.endedAt)
        : t("operator.assignments.notEnded"),
    },
    {
      icon: NotebookPen,
      label: t("operator.assignments.notes"),
      value: assignment.notes || t("operator.assignments.noOperatorNotes"),
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4 rounded-2xl bg-muted/60 p-4">
        <NAvatar
          src={getPersonImage({
            image: assignment.sponsorImage,
            role: "adult",
            gender: assignment.sponsorGender,
          })}
          alt={assignment.sponsorLabel}
          size="xl"
          classNames={{ avatar: "bg-muted" }}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-semibold text-foreground">
            {assignment.sponsorLabel}
          </p>
          <p className="truncate text-sm text-muted-foreground">
            {assignment.familyLabel}
          </p>
          <NBadge className="mt-2" status={assignment.status} />
        </div>
      </div>

      <div className="border-t border-border" />

      <NDetailList items={detailItems} />
    </div>
  );
}
