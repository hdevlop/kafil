"use client";

import { useMemo } from "react";
import { type NTableProps } from "najm-kit";

import { formatKafilDate } from "@/lib/format";
import { getFamilyAvatarImage } from "@/lib/personImages";
import { StatusBadge } from "@/shared/StatusBadge";
import { FundingProgressBar } from "@/shared/FundingProgressCard";
import { ManagedAvatar } from "@/shared/ManagedAvatar";
import { useKafilLanguage } from "@/i18n/useKafilLanguage";
import { Operator } from "@/shared/Authorization";

import type { FamilyRecord } from "../types";

export function useFamiliesTableColumns() {
  const { t } = useKafilLanguage();
  return useMemo<NTableProps<FamilyRecord>["columns"]>(
    () => [
      {
        accessorKey: "name",
        header: t("operator.families.account"),
        cell: ({ row }) => (
          <ManagedAvatar
            src={getFamilyAvatarImage(row.original.image)}
            title={row.original.name}
            classNames={{ avatar: "bg-muted" }}
          />
        ),
      },
      {
        accessorKey: "email",
        header: t("operator.families.email"),
        cell: ({ row }) => {
          const email = row.original.email;
          return (
            <Operator fallback="—">{email}</Operator>
          );
        },
        meta: {
          hiddenBelow: "2xl",
        },
      },
      {
        accessorKey: "phone",
        header: t("operator.families.phone"),
        cell: ({ getValue }) => (
          <Operator fallback="—">{getValue<string | null>() || "—"}</Operator>
        ),
        meta: {
          hiddenBelow: "lg",
        },
      },
      {
        accessorKey: "relationshipToChildren",
        header: t("operator.families.relationship"),
        cell: ({ getValue }) => (
          <Operator fallback="—">{getValue<string | null>() || "—"}</Operator>
        ),
        meta: {
          hiddenBelow: "lg",
        },
      },
      {
        id: "funding",
        header: t("operator.families.fundingProgress"),
        cell: ({ row }) =>
          row.original.funding ? (
            <div className="w-36">
              <FundingProgressBar compact progress={row.original.funding} />
            </div>
          ) : (
            "—"
          ),
      },
      {
        accessorKey: "status",
        header: t("operator.families.status"),
        cell: ({ getValue }) => <StatusBadge status={getValue<string>()} />,
      },
      {
        accessorKey: "createdAt",
        header: t("operator.families.created"),
        cell: ({ getValue }) => formatKafilDate(getValue<string>()),
        meta: {
          hiddenBelow: "lg",
        },
      },
    ],
    [t],
  );
}