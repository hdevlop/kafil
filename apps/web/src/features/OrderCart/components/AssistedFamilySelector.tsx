"use client";

import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarRange, Target, Wallet } from "lucide-react";
import { ComboboxInput, NCard } from "najm-kit";

import { useKafilLanguage } from "@/i18n/KafilLanguageProvider";
import { formatMad } from "@/lib/format";
import { listFamilies } from "@/services/familyApi";
import { getBudgetSummary } from "@/services/budgetApi";
import { createOffsetPagination } from "@/lib/pagination";

const FAMILIES_FETCH_LIMIT = 100;

function fundingPercent(fundedMinor: number, targetMinor: number) {
  if (targetMinor <= 0) return 100;
  return Math.min(100, Math.round((fundedMinor / targetMinor) * 100));
}

function fundingPercentToneClass(percent: number) {
  if (percent >= 100) return "text-emerald-600 dark:text-emerald-400";
  if (percent >= 75) return "text-lime-600 dark:text-lime-400";
  if (percent >= 50) return "text-amber-600 dark:text-amber-400";
  if (percent >= 25) return "text-orange-600 dark:text-orange-400";
  return "text-rose-600 dark:text-rose-400";
}

export interface AssistedFamilySelectorProps {
  value: string;
  onChange: (familyProfileId: string) => void;
  onFundingEligibilityChange?: (eligible: boolean) => void;
  disabled?: boolean;
}

export function AssistedFamilySelector({
  value,
  onChange,
  onFundingEligibilityChange,
  disabled = false,
}: Readonly<AssistedFamilySelectorProps>) {
  const { t } = useKafilLanguage();
  const families = useQuery({
    queryKey: ["assisted-family-selector", "families", { status: "active" }] as const,
    queryFn: () =>
      listFamilies(createOffsetPagination(0, FAMILIES_FETCH_LIMIT), {
        status: "active",
      }),
    refetchOnMount: "always",
    staleTime: 0,
  });

  const activeFamilies = useMemo(
    () => (families.data ?? []).filter((family) => family.status === "active"),
    [families.data],
  );
  const selected = useMemo(
    () => activeFamilies.find((family) => family.id === value) ?? null,
    [activeFamilies, value],
  );
  const familyItems = useMemo(
    () =>
      activeFamilies.map((family) => ({
        value: family.id,
        label: family.email
          ? `${family.guardianLegalName} · ${family.email}`
          : family.guardianLegalName,
      })),
    [activeFamilies],
  );

  const summary = useQuery({
    queryKey: ["assisted-family-selector", "summary", value],
    queryFn: () => getBudgetSummary(value),
    enabled: Boolean(value),
    refetchOnMount: "always",
  });
  const fundingTargetReached =
    !summary.isFetching && summary.data?.funding?.status === "active";
  const targetToneClass = fundingTargetReached
    ? "text-emerald-600 dark:text-emerald-400"
    : "text-foreground";
  const funding = summary.data?.funding ?? null;
  const percent = funding
    ? fundingPercent(funding.fundedMinor, funding.targetMinor)
    : 0;
  const percentToneClass = fundingPercentToneClass(percent);
  const availableMinor = summary.data?.availableMinor ?? 0;
  const monthlyLimitMinor = summary.data?.monthlyLimit?.limitMinor ?? null;

  useEffect(() => {
    onFundingEligibilityChange?.(fundingTargetReached);
  }, [fundingTargetReached, onFundingEligibilityChange]);

  function handleFamilyChange(familyProfileId: string) {
    onFundingEligibilityChange?.(false);
    onChange(familyProfileId);
  }

  return (
    <div className="space-y-1.5">
      <ComboboxInput
        allowFreeText={false}
        className="h-9 w-full"
        disabled={disabled || families.isPending}
        emptyMessage=""
        items={familyItems}
        onChange={handleFamilyChange}
        placeholder={t("family.orderCart.selectFamily")}
        searchPlaceholder={t("family.orderCart.searchFamily")}
        value={value}
      />

      {selected ? (
        <NCard embedded noPadding className="rounded-lg bg-muted/30 p-2">
          <div className="grid grid-cols-3 items-center whitespace-nowrap text-xs">
            <span className="flex items-center gap-1.5 justify-self-start">
              <Wallet aria-hidden className="size-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">
                {t("operator.budgets.available")}:
              </span>
              <span className="font-semibold text-foreground">
                {formatMad(availableMinor)}
              </span>
            </span>
            <span className="flex items-center gap-1.5 justify-self-center">
              <CalendarRange
                aria-hidden
                className="size-3.5 text-muted-foreground"
              />
              <span className="text-muted-foreground">
                {t("operator.budgets.monthlyLimit")}:
              </span>
              <span className="font-semibold text-foreground">
                {monthlyLimitMinor === null
                  ? "—"
                  : formatMad(monthlyLimitMinor)}
              </span>
            </span>
            {funding ? (
              <span className="flex items-center gap-1.5 justify-self-end">
                <Target
                  aria-hidden
                  className={`size-3.5 ${targetToneClass}`}
                />
                <span className={`font-semibold ${targetToneClass}`}>
                  {t("funding.target", {
                    amount: formatMad(funding.targetMinor),
                  })}
                </span>
                <span className={`font-semibold ${percentToneClass}`}>
                  / {percent}%
                </span>
              </span>
            ) : null}
          </div>
        </NCard>
      ) : null}
    </div>
  );
}
