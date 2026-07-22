"use client";

import { useMemo } from "react";
import { NAvatar, type NTableProps } from "najm-kit";

import { useKafilLanguage } from "@/i18n/KafilLanguageProvider";
import { formatKafilDate, formatMad } from "@/lib/format";
import { getSponsorAvatarImage } from "@/lib/personImages";
import { StatusBadge } from "@/shared/StatusBadge";

import type { BudgetLedgerEntry } from "../types";

export function useBudgetLedgerTableColumns() {
  const { language, t } = useKafilLanguage();

  return useMemo<NTableProps<BudgetLedgerEntry>["columns"]>(
    () => [
      {
        accessorKey: "sponsorName",
        header: t("operator.budgets.sponsor"),
        cell: ({ row }) => {
          const { sponsorGender, sponsorImage, sponsorName } = row.original;
          if (!sponsorName) return "—";

          return (
            <div className="flex items-center gap-3">
              <NAvatar
                src={getSponsorAvatarImage(sponsorImage, sponsorGender)}
                alt={sponsorName}
                classNames={{ avatar: "bg-muted" }}
              />
              <span>{sponsorName}</span>
            </div>
          );
        },
      },
      {
        accessorKey: "sponsorPhone",
        header: t("operator.budgets.phone"),
        cell: ({ getValue }) => getValue<string | null>() || "—",
      },
      {
        accessorKey: "amountMinor",
        header: t("operator.budgets.amount"),
        cell: ({ getValue }) => formatMad(getValue<number>(), language),
      },
      {
        accessorKey: "paymentMethod",
        header: t("operator.budgets.paymentMethod"),
        cell: ({ getValue }) => getValue<string | null>() || "—",
      },
      {
        accessorKey: "externalReference",
        header: t("operator.budgets.reference"),
        cell: ({ getValue }) => getValue<string | null>() || "—",
      },
      {
        accessorKey: "contributionStatus",
        header: t("operator.budgets.status"),
        cell: ({ getValue }) => {
          const status = getValue<string | null>();
          if (!status) return "—";
          return <StatusBadge status={status} />;
        },
      },
      {
        accessorKey: "createdAt",
        header: t("operator.budgets.recorded"),
        cell: ({ getValue }) => formatKafilDate(getValue<string>(), language),
      },
    ],
    [language, t],
  );
}
