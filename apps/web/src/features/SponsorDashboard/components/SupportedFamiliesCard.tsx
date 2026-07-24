"use client";

import { HeartHandshake } from "lucide-react";
import { NCard } from "najm-kit";
import Link from "next/link";

import type { KafilLanguage } from "@/lib/format";

import type { SupportedFamilyEntry } from "../types";
import { SupportedFamilyRow } from "./SupportedFamilyRow";

export function SupportedFamiliesCard({
  families,
  hasMore,
  language,
  t,
}: Readonly<{
  families: SupportedFamilyEntry[];
  hasMore: boolean;
  language: KafilLanguage;
  t: (key: string) => string;
}>) {
  return (
    <NCard
      className="h-full"
      icon={HeartHandshake}
      title={t("dashboard.sponsor.mySupportedFamilies")}
    >
      <div className="space-y-3">
        {families.length > 0 ? (
          <>
            {families.map((family) => (
              <SupportedFamilyRow
                family={family}
                key={family.assignmentId}
                language={language}
                t={t}
              />
            ))}
            {hasMore && (
              <Link
                className="block rounded-lg border border-dashed border-border/70 px-4 py-3 text-center text-sm font-medium text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                href="/sponsor/support"
              >
                {t("dashboard.sponsor.viewAllSupport")}
              </Link>
            )}
          </>
        ) : (
          <Link
            className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border/70 px-4 py-10 hover:bg-muted/60"
            href="/sponsor/support"
          >
            <HeartHandshake className="size-8 text-muted-foreground/50" />
            <span className="text-sm text-muted-foreground">
              {t("dashboard.sponsor.findFamilyToSupport")}
            </span>
          </Link>
        )}
      </div>
    </NCard>
  );
}
