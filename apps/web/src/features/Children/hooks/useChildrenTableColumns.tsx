"use client";

import { useMemo } from "react";
import { NAvatar, SimpleTooltip, type NTableProps } from "najm-kit";

import { formatKafilDate } from "@/lib/format";
import { getChildPersonImage } from "@/lib/personImages";
import { StatusBadge } from "@/shared/StatusBadge";

import type { ChildRecord } from "../types";

export function useChildrenTableColumns() {
  return useMemo<NTableProps<ChildRecord>["columns"]>(
    () => [
      {
        accessorKey: "legalName",
        header: "Child",
        cell: ({ row }) => {
          const isFamilyUnavailable =
            row.original.familyStatus !== undefined &&
            row.original.familyStatus !== "active";
          const avatar = (
            <NAvatar
            src={getChildPersonImage(row.original.gender)}
            title={row.original.legalName}
            subtitle={row.original.gender === "F" ? "Female" : "Male"}
            classNames={{
              avatar: isFamilyUnavailable ? "bg-muted grayscale opacity-70" : "bg-muted",
            }}
          />
          );

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
        cell: ({ getValue }) => formatKafilDate(getValue<string>()),
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
        cell: ({ getValue }) => formatKafilDate(getValue<string>()),
      },
    ],
    [],
  );
}
