"use client";

import { useState } from "react";
import { DateInput, NButton, NPageHeader, NPageLayout, NTable } from "najm-kit";

import PageHeaderGlobalActions from "@/shared/PageHeaderGlobalActions";
import { useTranslation } from "najm-i18n/react";
import { casablancaToday } from "@/features/Dashboard/shared/deliveryTime";
import { useKafilRole } from "@/shared/Authorization";

import { useDeliveryFamiliesTableProps } from "../../hooks/useDeliveryFamiliesTableProps";
import type { DeliveryFamiliesFilters } from "../../hooks/useDeliveryFamilies";
import { useFamiliesTableProps } from "../../hooks/useFamiliesTableProps";
import { useSponsorFamiliesTableProps } from "../../hooks/useSponsorFamiliesTableProps";
import {
  SponsorContributionSheet,
  type SponsorContributionSelection,
} from "../SponsorContributionSheet";
import { FamiliesPageIcon } from "./FamiliesPageIcon";

export function FamiliesPage() {
  const { isExactDelivery, isExactSponsor } = useKafilRole();

  if (isExactSponsor) return <SponsorFamiliesPage />;
  if (isExactDelivery) return <DeliveryFamiliesPage />;
  return <ManagedFamiliesPage />;
}

function SponsorFamiliesPage() {
  const { t } = useTranslation();
  const [contribution, setContribution] =
    useState<SponsorContributionSelection | null>(null);
  const tableProps = useSponsorFamiliesTableProps((family, assignmentId) => {
    setContribution({ family, assignmentId });
  });

  return (
    <NPageLayout className="flex h-full min-h-0 flex-col gap-4">
      <NPageHeader
        icon={FamiliesPageIcon}
        title={t("sponsor.directory.title")}
        subtitle={t("sponsor.directory.subtitle")}
        actions={<PageHeaderGlobalActions />}
      />
      <div className="min-h-0 flex-1">
        <NTable {...tableProps} />
      </div>
      <SponsorContributionSheet
        selection={contribution}
        onOpenChange={(open) => {
          if (!open) setContribution(null);
        }}
      />
    </NPageLayout>
  );
}

function ManagedFamiliesPage() {
  const { t } = useTranslation();
  const tableProps = useFamiliesTableProps();

  return (
    <NPageLayout className="flex h-full min-h-0 flex-col gap-4">
      <NPageHeader
        icon={FamiliesPageIcon}
        title={t("operator.families.title")}
        subtitle={t("operator.families.subtitle")}
        actions={<PageHeaderGlobalActions />}
      />
      <div className="min-h-0 flex-1">
        <NTable {...tableProps} />
      </div>
    </NPageLayout>
  );
}

function DeliveryFamiliesPage() {
  const { t } = useTranslation();
  const today = casablancaToday();
  const [filters, setFilters] = useState<DeliveryFamiliesFilters>({ date: today });
  const tableProps = useDeliveryFamiliesTableProps(filters, setFilters);

  function changeDate(next: string | undefined) {
    if (!next || next === filters.date) return;
    setFilters((current) => ({ ...current, date: next }));
  }

  return (
    <NPageLayout className="flex h-full min-h-0 flex-col gap-4">
      <NPageHeader
        icon={FamiliesPageIcon}
        title={t("dashboard.delivery.familiesTitle")}
        subtitle={t("dashboard.delivery.familiesSubtitle")}
        actions={<PageHeaderGlobalActions />}
      />
      <div className="flex items-center justify-end gap-2">
        <NButton
          aria-pressed={filters.date === today}
          className="h-10 px-3"
          onClick={() => changeDate(today)}
          size="lg"
          type="button"
          variant={filters.date === today ? "secondary" : "outline"}
        >
          {t("dashboard.delivery.today")}
        </NButton>
        <DateInput
          ariaLabel={t("dashboard.delivery.selectDate")}
          className="w-32 sm:w-48"
          onChange={changeDate}
          value={new Date(`${filters.date}T12:00:00`)}
        />
      </div>
      <div className="min-h-0 flex-1">
        <NTable {...tableProps} />
      </div>
    </NPageLayout>
  );
}
