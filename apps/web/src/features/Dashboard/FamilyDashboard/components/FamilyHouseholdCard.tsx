"use client";

import { HeartHandshake, House } from "lucide-react";
import {
  NAvatar,
  NBadge,
  NCard,
  NDetailList,
  NSection,
} from "najm-kit";


import { useTranslation } from "najm-i18n/react";
import type { FamilyDashboardProfile } from "../types";

export function FamilyHouseholdCard({
  profile,
}: Readonly<{ profile: FamilyDashboardProfile }>) {
  const { t } = useTranslation();
  return (
    <NCard icon={House} title={t("dashboard.family.householdTitle")} description={t("dashboard.family.householdDescription")}>
      <div className="flex items-center gap-4 rounded-2xl bg-muted/60 p-4">
        <NAvatar src={profile.image ?? undefined} title={profile.name} size="lg" />
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold">{profile.name}</p>
          <p className="truncate text-sm text-muted-foreground">{profile.email}</p>
          <NBadge className="mt-2" status={profile.status} />
        </div>
      </div>

      <div className="mt-5 space-y-5">
        <NSection icon={House} title={t("dashboard.family.householdDetails")}>
          <NDetailList
            items={[
              { label: t("dashboard.family.guardianLabel"), value: profile.guardianLegalName },
              { label: t("dashboard.family.addressLabel"), value: profile.exactAddress },
              { label: t("dashboard.family.phoneLabel"), value: profile.phone || t("dashboard.family.notProvided") },
            ]}
          />
        </NSection>
        <NSection icon={HeartHandshake} title={t("dashboard.family.familyProfile")}>
          <NDetailList
            items={[
              {
                label: t("dashboard.family.relationshipLabel"),
                value: profile.relationshipToChildren || t("dashboard.family.notProvided"),
              },
            ]}
          />
        </NSection>
      </div>
    </NCard>
  );
}
