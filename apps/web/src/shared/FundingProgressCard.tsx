"use client";

import { BadgeCheck, CircleDollarSign } from "lucide-react";
import { NCard, NProgress } from "najm-kit";

import { formatMad } from "@/lib/format";
import type { FamilyFundingProgress } from "@/types/funding";

import { StatusBadge } from "./StatusBadge";

export function fundingProgressPercent(progress: FamilyFundingProgress) {
  if (progress.targetMinor <= 0) return 100;
  return Math.min(100, Math.round((progress.fundedMinor / progress.targetMinor) * 100));
}

export function FundingProgressBar({
  progress,
  compact = false,
  inline = false,
}: Readonly<{
  progress: FamilyFundingProgress;
  compact?: boolean;
  inline?: boolean;
}>) {
  const percent = fundingProgressPercent(progress);

  if (inline) {
    return (
      <div
        className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-2 text-xs sm:flex sm:gap-3"
        title={`${percent}% funded`}
      >
        <span className="font-semibold text-primary">{percent}%</span>
        <div
          aria-label="Family funding progress"
          aria-valuemax={100}
          aria-valuemin={0}
          aria-valuenow={percent}
          className="col-span-full row-start-2 h-1.5 w-full min-w-0 overflow-hidden rounded-full bg-muted sm:row-auto sm:flex-1"
          role="progressbar"
        >
          <div
            className="h-full rounded-full bg-primary transition-[width]"
            style={{ width: `${percent}%` }}
          />
        </div>
        <span className="col-start-2 row-start-1 justify-self-end whitespace-nowrap font-medium text-foreground">
          {formatMad(progress.fundedMinor)} / {formatMad(progress.targetMinor)}
        </span>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="w-36 space-y-1" title={`${percent}% funded`}>
        <p className="whitespace-nowrap text-xs font-medium leading-none">
          {formatMad(progress.fundedMinor)} / {formatMad(progress.targetMinor)}
        </p>
        <div
          aria-label="Family funding progress"
          aria-valuemax={100}
          aria-valuemin={0}
          aria-valuenow={percent}
          className="h-1.5 overflow-hidden rounded-full bg-muted"
          role="progressbar"
        >
          <div
            className="h-full rounded-full bg-primary transition-[width]"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2 text-sm">
      <div className="flex items-center justify-between gap-3 text-muted-foreground">
        <span className="font-medium text-foreground">Funding progress</span>
        <span>Target: {formatMad(progress.targetMinor)}</span>
      </div>
      <div
        aria-label="Family funding progress"
        aria-valuemax={100}
        aria-valuemin={0}
        aria-valuenow={percent}
        className="h-2 overflow-hidden rounded-full bg-muted"
        role="progressbar"
      >
        <div
          className="h-full rounded-full bg-primary transition-[width]"
          style={{ width: `${percent}%` }}
        />
      </div>
      <div className="flex items-center justify-between gap-3 font-medium">
        <span>
          {formatMad(progress.fundedMinor)} / {formatMad(progress.targetMinor)}
        </span>
        <span className="text-primary">{percent}%</span>
      </div>
    </div>
  );
}

export function FundingProgressCard({
  progress,
  title = "Family funding",
}: Readonly<{
  progress: FamilyFundingProgress;
  title?: string;
}>) {
  const percent = fundingProgressPercent(progress);
  return (
    <NCard
      icon={progress.status === "active" ? BadgeCheck : CircleDollarSign}
      title={title}
      description={
        progress.status === "active"
          ? "Funding target reached. Household ordering is enabled."
          : `${formatMad(progress.remainingMinor)} remains before household ordering is enabled.`
      }
    >
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3 text-sm">
          <span>
            {formatMad(progress.fundedMinor)} of {formatMad(progress.targetMinor)}
          </span>
          <StatusBadge status={progress.status} />
        </div>
        <NProgress
          aria-label="Family funding progress"
          color={progress.status === "active" ? "success" : "primary"}
          value={percent}
          label={`${percent}%`}
          labelPosition="outside-right"
        />
      </div>
    </NCard>
  );
}
