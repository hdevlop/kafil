"use client";

import { BadgeCheck, CircleDollarSign, ClockAlert } from "lucide-react";
import { NCard, NProgress } from "najm-kit";

import { useKafilLanguage } from "@/i18n/useKafilLanguage";
import { formatDateTime, formatMad } from "@/lib/format";
import type { FamilyFundingProgress } from "@/types/funding";

import { StatusBadge } from "./StatusBadge";

export function fundingProgressPercent(progress: FamilyFundingProgress) {
  if (progress.targetMinor <= 0) return 100;
  return Math.min(100, Math.round((progress.fundedMinor / progress.targetMinor) * 100));
}

function fundingProgressTone(percent: number) {
  if (percent >= 100) {
    return {
      background: "bg-emerald-600 dark:bg-emerald-400",
      text: "text-emerald-600 dark:text-emerald-400",
    };
  }
  if (percent >= 75) {
    return {
      background: "bg-lime-600 dark:bg-lime-400",
      text: "text-lime-600 dark:text-lime-400",
    };
  }
  if (percent >= 50) {
    return {
      background: "bg-amber-500 dark:bg-amber-400",
      text: "text-amber-600 dark:text-amber-400",
    };
  }
  if (percent >= 25) {
    return {
      background: "bg-orange-500 dark:bg-orange-400",
      text: "text-orange-600 dark:text-orange-400",
    };
  }
  return {
    background: "bg-rose-500 dark:bg-rose-400",
    text: "text-rose-600 dark:text-rose-400",
  };
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
  const { t } = useKafilLanguage();
  const percent = fundingProgressPercent(progress);
  const hasReachedTarget = percent >= 100;
  const progressTone = fundingProgressTone(percent);
  const percentLabel = t("funding.percentFunded", { percent });
  const ariaLabel = t("funding.aria");

  if (inline) {
    return (
      <div
        className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-2 text-xs"
        title={percentLabel}
      >
        <span
          className={`font-semibold ${progressTone.text}`}
        >
          {percent}%
        </span>
        <div
          aria-label={ariaLabel}
          aria-valuemax={100}
          aria-valuemin={0}
          aria-valuenow={percent}
          className="col-span-full row-start-2 h-1.5 w-full min-w-0 overflow-hidden rounded-full bg-muted"
          role="progressbar"
        >
          <div
            className={`h-full rounded-full transition-[width] ${progressTone.background}`}
            style={{ width: `${percent}%` }}
          />
        </div>
        <span
          className={`col-start-2 row-start-1 justify-self-end whitespace-nowrap font-medium ${
            hasReachedTarget
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-foreground"
          }`}
        >
          {formatMad(progress.fundedMinor)} / {formatMad(progress.targetMinor)}
        </span>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="w-36 space-y-1" title={percentLabel}>
        <p className="whitespace-nowrap text-xs font-medium leading-none">
          {formatMad(progress.fundedMinor)} / {formatMad(progress.targetMinor)}
        </p>
        <div
          aria-label={ariaLabel}
          aria-valuemax={100}
          aria-valuemin={0}
          aria-valuenow={percent}
          className="h-1.5 overflow-hidden rounded-full bg-muted"
          role="progressbar"
        >
          <div
            className={`h-full rounded-full transition-[width] ${progressTone.background}`}
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2 text-sm">
      <div className="flex items-center justify-between gap-3 text-muted-foreground">
        <span className="font-medium text-foreground">{t("funding.progress")}</span>
        <span>{t("funding.target", { amount: formatMad(progress.targetMinor) })}</span>
      </div>
      <div
        aria-label={ariaLabel}
        aria-valuemax={100}
        aria-valuemin={0}
        aria-valuenow={percent}
        className="h-2 overflow-hidden rounded-full bg-muted"
        role="progressbar"
      >
        <div
          className={`h-full rounded-full transition-[width] ${progressTone.background}`}
          style={{ width: `${percent}%` }}
        />
      </div>
      <div className="flex items-center justify-between gap-3 font-medium">
        <span>
          {formatMad(progress.fundedMinor)} / {formatMad(progress.targetMinor)}
        </span>
        <span className={progressTone.text}>{percent}%</span>
      </div>
    </div>
  );
}

export function FundingProgressCard({
  progress,
  title,
}: Readonly<{
  progress: FamilyFundingProgress;
  title?: string;
}>) {
  const { t } = useKafilLanguage();
  const percent = fundingProgressPercent(progress);
  const isFunded = progress.capacityStatus === "funded";
  const isReserved = progress.capacityStatus === "reserved";
  const description = isFunded
    ? t("funding.reachedDescription")
    : isReserved
      ? t("funding.reservedDescription")
      : t("funding.openDescription", {
          amount: formatMad(progress.remainingMinor),
        });
  const icon = isFunded ? BadgeCheck : isReserved ? ClockAlert : CircleDollarSign;

  return (
    <NCard
      icon={icon}
      title={title ?? t("funding.familyTitle")}
      description={description}
    >
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <span>
            {t("funding.fundedOfTarget", {
              funded: formatMad(progress.fundedMinor),
              target: formatMad(progress.targetMinor),
            })}
          </span>
          <StatusBadge status={progress.status} />
        </div>
        <NProgress
          aria-label={t("funding.aria")}
          color={isFunded ? "success" : "primary"}
          value={percent}
          label={`${percent}%`}
          labelPosition="outside-right"
        />
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="rounded-md bg-muted/40 px-2 py-1">
            <p className="font-medium text-muted-foreground">
              {t("funding.pendingReservation")}
            </p>
            <p className="font-semibold text-foreground">
              {formatMad(progress.pendingMinor)}
            </p>
          </div>
          <div className="rounded-md bg-muted/40 px-2 py-1">
            <p className="font-medium text-muted-foreground">
              {t("funding.availableToContribute")}
            </p>
            <p className="font-semibold text-foreground">
              {formatMad(progress.availableToContributeMinor)}
            </p>
          </div>
        </div>
        {progress.capacityStatus !== "open" ? (
          <p className="text-xs text-muted-foreground">
            {t(`funding.${progress.capacityStatus}`)}
            {progress.nextPendingExpiryAt
              ? ` · ${t("funding.earliestExpiry", {
                  date: formatDateTime(progress.nextPendingExpiryAt),
                })}`
              : ""}
          </p>
        ) : null}
      </div>
    </NCard>
  );
}
