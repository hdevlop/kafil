"use client";

import { ArrowRight, UsersRound } from "lucide-react";
import { NButton, NCard, NCardAction } from "najm-kit";
import Link from "next/link";

import { useKafilLanguage } from "@/i18n/KafilLanguageProvider";
import { formatKafilNumber } from "@/lib/format";
import { getChildAvatarImage, getParentPersonImage } from "@/lib/personImages";
import { ManagedAvatar } from "@/shared/ManagedAvatar";
import { StatusBadge } from "@/shared/StatusBadge";

import type { FamilyChildRecord, FamilyDashboardProfile } from "../types";

function ageFromDateOfBirth(dateOfBirth: string) {
  const birthDate = new Date(`${dateOfBirth}T00:00:00`);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const birthdayPassed =
    today.getMonth() > birthDate.getMonth() ||
    (today.getMonth() === birthDate.getMonth() && today.getDate() >= birthDate.getDate());

  if (!birthdayPassed) age -= 1;
  return Math.max(0, age);
}

export function MyFamilyCard({
  familyChildren,
  profile,
}: Readonly<{
  familyChildren: FamilyChildRecord[];
  profile: FamilyDashboardProfile;
}>) {
  const { language, t } = useKafilLanguage();

  return (
    <NCard className="h-full" icon={UsersRound} title={t("dashboard.family.myFamily")}>
      <NCardAction>
        <NButton asChild size="2xs" variant="ghost" rightIcon={ArrowRight}>
          <Link href="/family/children">{t("dashboard.family.viewAll")}</Link>
        </NButton>
      </NCardAction>

      <div className="space-y-2">
        <article className="flex items-center gap-3 rounded-xl bg-muted/40 p-3">
          <ManagedAvatar
            src={getParentPersonImage(profile.relationshipToChildren)}
            title={profile.name}
            subtitle={profile.relationshipToChildren
              ? `${t("dashboard.family.guardian")} · ${profile.relationshipToChildren}`
              : t("dashboard.family.guardian")}
            size="lg"
            className="min-w-0 flex-1"
          />
          <StatusBadge status={profile.status} />
        </article>

        {familyChildren.slice(0, 2).map((child) => {
          const age = ageFromDateOfBirth(child.dateOfBirth);
          return (
            <article className="flex items-center gap-3 rounded-xl bg-muted/40 p-3" key={child.id}>
              <ManagedAvatar
                src={getChildAvatarImage(child.image, child.gender)}
                title={child.legalName}
                subtitle={t(age === 1 ? "dashboard.family.yearOld" : "dashboard.family.yearsOld", {
                  count: formatKafilNumber(age, language),
                })}
                size="lg"
                className="min-w-0 flex-1"
              />
              <StatusBadge status={child.status} />
            </article>
          );
        })}
      </div>
    </NCard>
  );
}
