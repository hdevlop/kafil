"use client";

import { useMemo } from "react";
import {
  NAvatar,
  NBadge,
  useNajmFormat,
  type NTableProps,
} from "najm-kit";
import { getPersonImage } from "najm-kit/person-images";

import { useTranslation } from "najm-i18n/react";

import type { SupportAssignmentView } from "../types";

export function useSupportAssignmentsTableColumns() {
  const { t } = useTranslation();
  const fmt = useNajmFormat();
  return useMemo<NTableProps<SupportAssignmentView>["columns"]>(() => {
    return [
      {
        accessorKey: "sponsorLabel",
        header: t("operator.assignments.sponsor"),
        cell: ({ row }) => (
          <div className="flex min-w-0 items-center gap-3">
            <NAvatar
              src={getPersonImage({ image: row.original.sponsorImage, role: "adult", gender: row.original.sponsorGender, })}
              classNames={{ avatar: "bg-muted" }}
            />
            <span className="truncate">{row.original.sponsorLabel}</span>
          </div>
        ),
      },
      {
        accessorKey: "sponsorEmail",
        header: t("operator.sponsors.email"),
        meta: { hiddenBelow: "2xl" },
      },
      {
        accessorKey: "sponsorPhone",
        header: t("operator.sponsors.phone"),
        cell: ({ getValue }) => getValue<string | null>() ?? "\u2014",
      },
      { accessorKey: "familyLabel", header: t("operator.assignments.family") },
      {
        accessorKey: "status",
        header: t("operator.assignments.status"),
        cell: ({ getValue }) => <NBadge status={getValue<string>()} />,
      },
      {
        accessorKey: "startedAt",
        header: t("operator.assignments.started"),
        cell: ({ getValue }) => fmt.date(getValue<string>()),
      },
    ];
  }, [fmt, t]);
}
