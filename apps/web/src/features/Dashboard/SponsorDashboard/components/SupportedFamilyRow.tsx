"use client";

import Link from "next/link";

import { formatKafilDate, type KafilLanguage } from "@/lib/format";
import { getFamilyAvatarImage } from "@/lib/personImages";
import { FundingProgressBar } from "@/shared/FundingProgressCard";
import { ManagedAvatar } from "@/shared/ManagedAvatar";

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
      href="/family"
    >
      <ManagedAvatar
        alt={family.familyName}
        className="shrink-0"
        size="xl"
        src={getFamilyAvatarImage(family.image)}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{family.familyName}</p>
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
