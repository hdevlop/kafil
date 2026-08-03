"use client";

import { BadgeCheck } from "lucide-react";

import { getFamilyAvatarImage } from "@/lib/personImages";
import { FundingProgressBar } from "@/shared/FundingProgressCard";
import { StatusBadge } from "@/shared/StatusBadge";
import { ProtectedImage } from "@/shared/ProtectedImage";

import type { FamilyRecord } from "../../types";

export function FamilyDetailsHero({
  family,
}: Readonly<{ family: FamilyRecord }>) {
  const fundingStatus =
    family.funding?.status === "active" ? "active" : "pending";

  return (
    <div className="space-y-3">
      <section className="space-y-2">
        <div className="relative h-52 overflow-hidden rounded-2xl bg-muted sm:h-60">
          <ProtectedImage
            src={getFamilyAvatarImage(family.image)}
            alt={family.name}
            fill
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-cover"
          />
        </div>
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-1.5">
            <h2 className="truncate text-lg font-semibold text-foreground">
              {family.name}
            </h2>
            {fundingStatus === "active" ? (
              <BadgeCheck
                aria-hidden
                className="size-4 shrink-0 fill-primary text-primary-foreground"
              />
            ) : null}
          </div>
          <StatusBadge className="shrink-0" status={fundingStatus} />
        </div>
      </section>

      {family.funding ? (
        <FundingProgressBar inline progress={family.funding} />
      ) : null}
    </div>
  );
}
