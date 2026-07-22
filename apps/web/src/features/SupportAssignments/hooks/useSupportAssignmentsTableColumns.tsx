"use client";

import { useMemo } from "react";
import { NAvatar, type NTableProps } from "najm-kit";

import { useKafilLanguage } from "@/i18n/KafilLanguageProvider";
import { formatKafilDate } from "@/lib/format";
import { getSponsorAvatarImage } from "@/lib/personImages";
import { StatusBadge } from "@/shared/StatusBadge";

import type { SupportAssignmentView } from "../types";

export function useSupportAssignmentsTableColumns() {
  const { language, t } = useKafilLanguage();
  return useMemo<NTableProps<SupportAssignmentView>["columns"]>(
    () => [
      {
        accessorKey: "sponsorLabel",
        header: t("operator.assignments.sponsor"),
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <NAvatar
              src={getSponsorAvatarImage(
                row.original.sponsorImage,
                row.original.sponsorGender,
              )}
              classNames={{ avatar: "bg-muted" }}
            />
            <span>{row.original.sponsorLabel}</span>
          </div>
        ),
      },
      { accessorKey: "sponsorEmail", header: t("operator.sponsors.email") },
      {
        accessorKey: "sponsorPhone",
        header: t("operator.sponsors.phone"),
        cell: ({ getValue }) => getValue<string | null>() ?? "\u2014",
      },
      { accessorKey: "familyLabel", header: t("operator.assignments.family") },
      {
        accessorKey: "status",
        header: t("operator.assignments.status"),
        cell: ({ getValue }) => <StatusBadge status={getValue<string>()} />,
      },
      {
        accessorKey: "startedAt",
        header: t("operator.assignments.started"),
        cell: ({ getValue }) => formatKafilDate(getValue<string>(), language),
      },
    ],
    [language, t],
  );
}
