"use client";

import { useState } from "react";
import { NPageHeader, NPageLayout, NTable } from "najm-kit";

import PageHeaderGlobalActions from "@/shared/PageHeaderGlobalActions";
import { useKafilLanguage } from "@/i18n/KafilLanguageProvider";
import { useKafilRole } from "@/shared/Authorization";

import { useFamiliesTableProps } from "../../hooks/useFamiliesTableProps";
import { useSponsorFamiliesTableProps } from "../../hooks/useSponsorFamiliesTableProps";
import {
  SponsorContributionSheet,
  type SponsorContributionSelection,
} from "../SponsorContributionSheet";
import { FamiliesPageIcon } from "./FamiliesPageIcon";

export function FamiliesPage() {
  const { isExactSponsor } = useKafilRole();

  return isExactSponsor ? <SponsorFamiliesPage /> : <ManagedFamiliesPage />;
}

function SponsorFamiliesPage() {
  const { t } = useKafilLanguage();
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
  const { t } = useKafilLanguage();
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
