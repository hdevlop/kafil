"use client";

import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarRange, Wallet } from "lucide-react";
import { ComboboxInput, NCard } from "najm-kit";

import { useKafilLanguage } from "@/i18n/KafilLanguageProvider";
import { formatMad } from "@/lib/format";
import { listFamilies } from "@/services/familyApi";
import { getBudgetSummary } from "@/services/budgetApi";
import { createOffsetPagination } from "@/lib/pagination";

const FAMILIES_FETCH_LIMIT = 100;

export interface AssistedFamilySelectorProps {
  value: string;
  onChange: (familyProfileId: string) => void;
  onFundingEligibilityChange?: (eligible: boolean) => void;
  onSelectionChange?: (selection: AssistedFamilySelection | null) => void;
  disabled?: boolean;
}

export interface AssistedFamilySelection {
  id: string;
  name: string;
  image: string | null;
  exactAddress: string;
  phone: string | null;
  availableMinor: number;
}

export function AssistedFamilySelector({
  value,
  onChange,
  onFundingEligibilityChange,
  onSelectionChange,
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
  const availableMinor = summary.data?.availableMinor ?? 0;
  const monthlyLimitMinor = summary.data?.monthlyLimit?.limitMinor ?? null;

  useEffect(() => {
    onFundingEligibilityChange?.(fundingTargetReached);
  }, [fundingTargetReached, onFundingEligibilityChange]);

  useEffect(() => {
    onSelectionChange?.(
      selected
        ? {
            id: selected.id,
            name: selected.name || selected.guardianLegalName,
            image: selected.image,
            exactAddress: selected.exactAddress,
            phone: selected.phone,
            availableMinor,
          }
        : null,
    );
  }, [availableMinor, onSelectionChange, selected]);

  function handleFamilyChange(familyProfileId: string) {
    onFundingEligibilityChange?.(false);
    onSelectionChange?.(null);
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
          <div className="grid grid-cols-2 items-center whitespace-nowrap text-xs">
            <span className="flex items-center gap-1.5 justify-self-start">
              <Wallet aria-hidden className="size-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">
                {t("operator.budgets.available")}:
              </span>
              <span className="font-semibold text-foreground">
                {formatMad(availableMinor)}
              </span>
            </span>
            <span className="flex items-center gap-1.5 justify-self-end">
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
          </div>
        </NCard>
      ) : null}
    </div>
  );
}
