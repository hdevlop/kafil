"use client";

import { HeartHandshake, House } from "lucide-react";
import { NAvatar, NCard, NDetailList, NSection } from "najm-kit";

import { StatusBadge } from "@/shared/StatusBadge";

import type { FamilyDashboardProfile } from "../types";

export function FamilyHouseholdCard({
  profile,
}: Readonly<{ profile: FamilyDashboardProfile }>) {
  return (
    <NCard icon={House} title="Your family profile" description="Your protected family information.">
      <div className="flex items-center gap-4 rounded-2xl bg-muted/60 p-4">
        <NAvatar src={profile.image ?? undefined} title={profile.name} size="lg" />
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold">{profile.name}</p>
          <p className="truncate text-sm text-muted-foreground">{profile.email}</p>
          <StatusBadge className="mt-2" status={profile.status} />
        </div>
      </div>

      <div className="mt-5 space-y-5">
        <NSection icon={House} title="Household details">
          <NDetailList
            items={[
              { label: "Guardian", value: profile.guardianLegalName },
              { label: "Address", value: profile.exactAddress },
              { label: "Phone", value: profile.phone || "Not provided" },
            ]}
          />
        </NSection>
        <NSection icon={HeartHandshake} title="Family profile">
          <NDetailList
            items={[
              {
                label: "Relationship to children",
                value: profile.relationshipToChildren || "Not provided",
              },
            ]}
          />
        </NSection>
      </div>
    </NCard>
  );
}
