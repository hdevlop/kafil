"use client";

import { NPageLayout, NTable } from "najm-kit";

import PageHeaderGlobalActions from "@/shared/PageHeaderGlobalActions";
import { DashboardPageHeader as NPageHeader } from "@/shared/DashboardShell/DashboardPageHeader";
import { useKafilLanguage } from "@/i18n/KafilLanguageProvider";
import { useKafilRole } from "@/shared/Authorization";

import { useFamiliesTableProps } from "../../hooks/useFamiliesTableProps";
import { FamiliesPageIcon } from "./FamiliesPageIcon";

export function FamiliesPage() {
  const { t } = useKafilLanguage();
  const { isExactSponsor } = useKafilRole();
  const tableProps = useFamiliesTableProps();

  return (
    <NPageLayout className="flex h-full min-h-0 flex-col gap-4">
      <NPageHeader
        icon={FamiliesPageIcon}
        title={t(isExactSponsor ? "sponsor.directory.title" : "operator.families.title")}
        subtitle={t(isExactSponsor ? "sponsor.directory.subtitle" : "operator.families.subtitle")}
        actions={<PageHeaderGlobalActions />}
      />
      <div className="min-h-0 flex-1">
        <NTable {...tableProps} />
      </div>
    </NPageLayout>
  );
}