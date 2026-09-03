"use client";

import { useMemo } from "react";
import {
  NAvatar,
  NBadge,
  SimpleTooltip,
  useNajmFormat,
  type NTableProps,
} from "najm-kit";

import { getPersonImage } from "najm-kit/person-images";

import { useKafilLanguage } from "@/i18n/useKafilLanguage";
import type { ChildRecord } from "../types";

export function useChildrenTableColumns() {
  const { t } = useKafilLanguage();
  const fmt = useNajmFormat();
  return useMemo<NTableProps<ChildRecord>["columns"]>(() => {
    return [
      {
        accessorKey: "legalName",
        header: t("operator.children.record"),
        cell: ({ row }) => {
          const isDisabled =
            row.original.status === "inactive" ||
            (row.original.familyStatus !== undefined &&
              row.original.familyStatus !== "active");
          const avatar = (
            <NAvatar
            src={getPersonImage({ image: row.original.image, role: "child", gender: row.original.gender })}
            title={row.original.legalName}
            subtitle={row.original.gender === "F" ? t("operator.families.female") : t("operator.families.male")}
            classNames={{
              avatar: isDisabled ? "bg-muted grayscale opacity-70" : "bg-muted",
            }}
          />
          );

          const isFamilyUnavailable =
            row.original.familyStatus !== undefined &&
            row.original.familyStatus !== "active";

          if (!isFamilyUnavailable) return avatar;

          return (
            <SimpleTooltip
              content={
                row.original.familyStatus === null
                  ? t("operator.children.familyRemoved")
                  : "This child's family account is inactive."
              }
              side="top"
            >
              {avatar}
            </SimpleTooltip>
          );
        },
      },
      {
        accessorKey: "dateOfBirth",
        header: t("operator.families.dateOfBirth"),
        cell: ({ getValue }) => fmt.date(getValue<string>()),
      },
      {
        accessorKey: "gender",
        header: t("operator.families.gender"),
        cell: ({ getValue }) =>
          getValue<string>() === "F" ? t("operator.families.female") : t("operator.families.male"),
      },
      {
        accessorKey: "schoolLevel",
        header: t("operator.families.schoolLevel"),
        cell: ({ getValue }) => getValue<string | null>() || "\u2014",
      },
      {
        accessorKey: "status",
        header: t("operator.families.status"),
        cell: ({ getValue }) => <NBadge status={getValue<string>()} />,
      },
      {
        accessorKey: "createdAt",
        header: t("operator.families.created"),
        cell: ({ getValue }) => fmt.date(getValue<string>()),
      },
    ];
  }, [fmt, t]);
}
