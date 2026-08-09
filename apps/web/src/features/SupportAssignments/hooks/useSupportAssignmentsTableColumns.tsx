"use client";

import { useMemo } from "react";
import { useNajmFormat, type NTableProps } from "najm-kit";
import { getPersonImage } from "najm-kit/person-images";

import { useKafilLanguage } from "@/i18n/useKafilLanguage";
import { ManagedAvatar } from "@/shared/ManagedAvatar";
import { StatusBadge } from "@/shared/StatusBadge";

import type { SupportAssignmentView } from "../types";

export function useSupportAssignmentsTableColumns() {
  const { t } = useKafilLanguage();
  const fmt = useNajmFormat();
  return useMemo<NTableProps<SupportAssignmentView>["columns"]>(() => {
    return [
      {
        accessorKey: "sponsorLabel",
        header: t("operator.assignments.sponsor"),
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <ManagedAvatar
              src={getPersonImage({ image: row.original.sponsorImage, role: "adult", gender: row.original.sponsorGender, })}
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
        cell: ({ getValue }) => fmt.date(getValue<string>()),
      },
    ];
  }, [fmt, t]);
}
