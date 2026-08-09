"use client";

import { useMemo } from "react";
import { useNajmFormat, type NTableProps } from "najm-kit";
import { getPersonImage } from "najm-kit/person-images";

import { useKafilLanguage } from "@/i18n/useKafilLanguage";
import { ManagedAvatar } from "@/shared/ManagedAvatar";
import { StatusBadge } from "@/shared/StatusBadge";

import type { ApplicantRecord } from "../types";

export function useApplicantsTableColumns() {
  const { t } = useKafilLanguage();
  const fmt = useNajmFormat();

  return useMemo<NTableProps<ApplicantRecord>["columns"]>(() => {
    return [
      {
        accessorKey: "name",
        header: t("operator.applicants.name"),
        cell: ({ row }) => (
          <ManagedAvatar
            src={getPersonImage({ image: null, role: "adult", gender: row.original.gender })}
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
        cell: ({ getValue }) => fmt.date(getValue<string>()),
      },
    ];
  }, [fmt, t]);
}
