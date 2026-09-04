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

import type { ApplicantRecord } from "../types";

export function useApplicantsTableColumns() {
  const { t } = useTranslation();
  const fmt = useNajmFormat();

  return useMemo<NTableProps<ApplicantRecord>["columns"]>(() => {
    return [
      {
        accessorKey: "name",
        header: t("operator.applicants.name"),
        cell: ({ row }) => (
          <NAvatar
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
        accessorKey: "gender",
        header: t("operator.applicants.gender"),
        cell: ({ getValue }) =>
          getValue<ApplicantRecord["gender"]>() === "F"
            ? t("operator.applicants.female")
            : t("operator.applicants.male"),
        meta: {
          hiddenBelow: "xl",
        },
      },
      {
        accessorKey: "cin",
        header: t("operator.applicants.cin"),
        meta: {
          hiddenBelow: "xl",
        },
      },
      {
        accessorKey: "status",
        header: t("operator.applicants.status"),
        cell: ({ getValue }) => <NBadge status={getValue<string>()} />,
      },
      {
        accessorKey: "submittedAt",
        header: t("operator.applicants.submitted"),
        cell: ({ getValue }) => fmt.date(getValue<string>()),
      },
    ];
  }, [fmt, t]);
}
