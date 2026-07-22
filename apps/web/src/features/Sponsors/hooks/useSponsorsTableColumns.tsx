"use client";

import { useMemo } from "react";
import { NAvatar, type NTableProps } from "najm-kit";

import { useKafilLanguage } from "@/i18n/KafilLanguageProvider";
import { formatKafilDate } from "@/lib/format";
import { getSponsorAvatarImage } from "@/lib/personImages";
import { StatusBadge } from "@/shared/StatusBadge";

import type { SponsorRecord } from "../types";

export function useSponsorsTableColumns() {
  const { language, t } = useKafilLanguage();
  return useMemo<NTableProps<SponsorRecord>["columns"]>(
    () => [
      {
        accessorKey: "name",
        header: t("operator.sponsors.account"),
        cell: ({ row }) => (
          <NAvatar
            src={getSponsorAvatarImage(
              row.original.image,
              row.original.gender,
            )}
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
        cell: ({ getValue }) => <StatusBadge status={getValue<string>()} />,
      },
      {
        accessorKey: "createdAt",
        header: t("operator.sponsors.created"),
        cell: ({ getValue }) => formatKafilDate(getValue<string>(), language),
      },
    ],
    [language, t],
  );
}
