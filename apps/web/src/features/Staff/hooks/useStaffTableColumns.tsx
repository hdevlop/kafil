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

import type { StaffRecord } from "../types";

function functionLabels(
  functions: StaffRecord["functions"],
  labels: { operator: string; delivery: string },
) {
  if (functions.length === 0) return labels.operator;
  return functions.map((fn) => (fn === "operator" ? labels.operator : labels.delivery)).join(", ");
}

export function matchesStaffFunction(
  functions: StaffRecord["functions"],
  selectedFunction: string,
) {
  return functions.includes(selectedFunction as StaffRecord["functions"][number]);
}

export function useStaffTableColumns() {
  const { t } = useTranslation();
  const fmt = useNajmFormat();
  return useMemo<NTableProps<StaffRecord>["columns"]>(() => {
    return [
      {
        accessorKey: "name",
        header: t("operator.staff.name"),
        cell: ({ row }) => (
          <NAvatar
            src={getPersonImage({ image: row.original.image, role: "adult", gender: row.original.gender, })}
            title={row.original.name}
            classNames={{ avatar: "bg-muted" }}
          />
        ),
      },
      {
        accessorKey: "functions",
        enableSorting: false,
        filterFn: (row, _columnId, selectedFunction) =>
          matchesStaffFunction(
            row.original.functions,
            String(selectedFunction),
          ),
        header: t("operator.staff.functions"),
        cell: ({ getValue }) =>
          functionLabels(getValue<StaffRecord["functions"]>(), {
            delivery: t("operator.staff.functionDelivery"),
            operator: t("operator.staff.functionOperator"),
          }),
      },
      {
        accessorKey: "affiliation",
        header: t("operator.staff.affiliationAndCompany"),
        cell: ({ row }) => {
          if (row.original.affiliation === "external") {
            return `${t("operator.staff.external")} · ${row.original.companyName ?? t("operator.staff.notProvided")}`;
          }
          return t("operator.staff.internal");
        },
      },
      {
        accessorKey: "phone",
        header: t("operator.staff.phone"),
        cell: ({ getValue }) => getValue<string>() || t("operator.staff.notProvided"),
      },
      {
        accessorKey: "contactEmail",
        enableSorting: false,
        header: t("operator.staff.email"),
        cell: ({ getValue }) =>
          getValue<string | null>() || t("operator.staff.notProvided"),
      },
      {
        accessorKey: "status",
        header: t("operator.staff.status"),
        cell: ({ getValue }) => <NBadge status={getValue<string>()} />,
      },
      {
        accessorKey: "createdAt",
        header: t("operator.staff.created"),
        cell: ({ getValue }) => fmt.date(getValue<string>()),
      },
    ];
  }, [fmt, t]);
}
