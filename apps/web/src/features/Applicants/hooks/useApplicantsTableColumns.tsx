"use client";

import { useMemo } from "react";
import { type NTableProps } from "najm-kit";

import { useKafilLanguage } from "@/i18n/KafilLanguageProvider";
import { formatKafilDate } from "@/lib/format";
import { getSponsorPersonImage } from "@/lib/personImages";
import { ManagedAvatar } from "@/shared/ManagedAvatar";
import { StatusBadge } from "@/shared/StatusBadge";

import type { ApplicantRecord } from "../types";

export function useApplicantsTableColumns() {
  const { language, t } = useKafilLanguage();

  return useMemo<NTableProps<ApplicantRecord>["columns"]>(
    () => [
      {
        accessorKey: "name",
        header: t("operator.applicants.name"),
        cell: ({ row }) => (
          <ManagedAvatar
            src={getSponsorPersonImage(row.original.gender)}
            title={row.original.name}
            classNames={{ avatar: "bg-muted" }}
          />
        ),
      },
      {
        accessorKey: "email",
        header: t("operator.applicants.email"),
      },
      {
        accessorKey: "phone",
        header: t("operator.applicants.phone"),
      },
      {
        accessorKey: "status",
        header: t("operator.applicants.status"),
        cell: ({ getValue }) => <StatusBadge status={getValue<string>()} />,
      },
      {
        accessorKey: "submittedAt",
        header: t("operator.applicants.submitted"),
        cell: ({ getValue }) =>
          formatKafilDate(getValue<string>(), language),
      },
    ],
    [language, t],
  );
}
