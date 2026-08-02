"use client";

import Link from "next/link";
import { Users } from "lucide-react";

import { formatKafilDate, type KafilLanguage } from "@/lib/format";
import { FundingProgressBar } from "@/shared/FundingProgressCard";

import type { SupportedFamilyEntry } from "../types";

export function SupportedFamilyRow({
  family,
  language,
  t,
}: Readonly<{
  family: SupportedFamilyEntry;
  language: KafilLanguage;
  t: (key: string) => string;
}>) {
  return (
    <Link
      className="flex items-center gap-4 rounded-xl border border-border/70 p-4 hover:bg-muted/60"
      href="/sponsor/support"
    >
      <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted">
        <Users className="size-5 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{family.supportReference}</p>
        <div className="mt-0.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span>
            {t("dashboard.sponsor.activeChildren")}: {family.activeChildCount}
          </span>
          <span>{formatKafilDate(family.startedAt, language)}</span>
        </div>
        {family.funding && (
          <div className="mt-2">
            <FundingProgressBar
              compact
              progress={family.funding}
            />
          </div>
        )}
      </div>
    </Link>
  );
}
