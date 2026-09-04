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

import type { SponsorRecord } from "../types";

export function useSponsorsTableColumns() {
  const { t } = useTranslation();
  const fmt = useNajmFormat();
  return useMemo<NTableProps<SponsorRecord>["columns"]>(() => {
    return [
      {
        accessorKey: "name",
        header: t("operator.sponsors.account"),
        cell: ({ row }) => (
          <NAvatar
            src={getPersonImage({ image: row.original.image, role: "adult", gender: row.original.gender, })}
            title={row.original.name}
            classNames={{ avatar: "bg-muted" }}
          />
        ),
      },
      {
        accessorKey: "email",
        header: t("operator.sponsors.email"),
      },
      {
        accessorKey: "phone",
        header: t("operator.sponsors.phone"),
        cell: ({ getValue }) => getValue<string | null>() || "\u2014",
      },
      {
        accessorKey: "gender",
        header: t("operator.sponsors.gender"),
        cell: ({ getValue }) => {
          const gender = getValue<SponsorRecord["gender"]>();
          return gender === "F" ? t("operator.sponsors.female") : gender === "M" ? t("operator.sponsors.male") : "\u2014";
        },
      },
      {
        accessorKey: "status",
        header: t("operator.sponsors.status"),
        cell: ({ getValue }) => <NBadge status={getValue<string>()} />,
      },
      {
        accessorKey: "createdAt",
        header: t("operator.sponsors.created"),
        cell: ({ getValue }) => fmt.date(getValue<string>()),
      },
    ];
  }, [fmt, t]);
}
