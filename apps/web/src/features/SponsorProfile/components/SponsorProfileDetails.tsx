"use client";

import { Contact, UserRound } from "lucide-react";
import { NAvatar, NCard, NDetailList, NSection } from "najm-kit";

import { StatusBadge } from "@/shared/StatusBadge";

import type { OwnSponsorProfile } from "../types";

export function SponsorProfileDetails({
  profile,
}: Readonly<{ profile: OwnSponsorProfile }>) {
  return (
    <NCard icon={UserRound} title="Your account" description="Only you can view these personal profile details.">
      <div className="flex items-center gap-4 rounded-2xl bg-muted/60 p-4">
        <NAvatar src={profile.image ?? undefined} title={profile.name} size="lg" />
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold">{profile.name}</p>
          <p className="truncate text-sm text-muted-foreground">{profile.email}</p>
          <StatusBadge className="mt-2" status={profile.status} />
        </div>
      </div>

      <NSection className="mt-5" icon={Contact} title="Private profile details">
        <NDetailList
          items={[
            { label: "Phone", value: profile.phone || "Not provided" },
            { label: "CIN", value: profile.cin || "Not provided" },
            {
              label: "Gender",
              value:
                profile.gender === "F"
                  ? "Female"
                  : profile.gender === "M"
                    ? "Male"
                    : "Not provided",
            },
            { label: "Date of birth", value: profile.dateOfBirth || "Not provided" },
            { label: "Address", value: profile.address || "Not provided" },
          ]}
        />
      </NSection>
    </NCard>
  );
}
