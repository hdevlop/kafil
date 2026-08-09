"use client";

import { useMemo } from "react";
import { SimpleTooltip, useNajmFormat, type NTableProps } from "najm-kit";

import { ManagedAvatar } from "@/shared/ManagedAvatar";
import { StatusBadge } from "@/shared/StatusBadge";
import { getPersonImage } from "najm-kit/person-images";

import type { ChildRecord } from "../types";

export function useChildrenTableColumns() {
  const fmt = useNajmFormat();
  return useMemo<NTableProps<ChildRecord>["columns"]>(() => {
    return [
      {
        accessorKey: "legalName",
        header: "Child",
        cell: ({ row }) => {
          const isDisabled =
            row.original.status === "inactive" ||
            (row.original.familyStatus !== undefined &&
              row.original.familyStatus !== "active");
          const avatar = (
            <ManagedAvatar
            src={getPersonImage({ image: row.original.image, role: "child", gender: row.original.gender })}
            title={row.original.legalName}
            subtitle={row.original.gender === "F" ? "Female" : "Male"}
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
                  ? "This child's family account has been removed."
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
        header: "Date of birth",
        cell: ({ getValue }) => fmt.date(getValue<string>()),
      },
      {
        accessorKey: "gender",
        header: "Gender",
        cell: ({ getValue }) =>
          getValue<string>() === "F" ? "Female" : "Male",
      },
      {
        accessorKey: "schoolLevel",
        header: "School level",
        cell: ({ getValue }) => getValue<string | null>() || "\u2014",
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ getValue }) => <StatusBadge status={getValue<string>()} />,
      },
      {
        accessorKey: "createdAt",
        header: "Created",
        cell: ({ getValue }) => fmt.date(getValue<string>()),
      },
    ];
  }, [fmt]);
}
