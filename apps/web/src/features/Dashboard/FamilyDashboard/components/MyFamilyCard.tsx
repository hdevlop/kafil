"use client";

import { ArrowRight, UsersRound } from "lucide-react";
import {
  NAvatar,
  NBadge,
  NButton,
  NCard,
  NCardAction,
  useNajmFormat,
} from "najm-kit";
import { getPersonImage } from "najm-kit/person-images";
import Link from "next/link";

import { useTranslation } from "najm-i18n/react";

import { parentGenderFromRelationship } from "../lib/parentGenderFromRelationship";
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
  const { t } = useTranslation();
  const fmt = useNajmFormat();

  return (
    <NCard className="h-full" icon={UsersRound} title={t("dashboard.family.myFamily")}>
      <NCardAction>
        <NButton asChild size="2xs" variant="ghost" rightIcon={ArrowRight}>
          <Link href="/children">{t("dashboard.family.viewAll")}</Link>
        </NButton>
      </NCardAction>

      <div className="space-y-2">
        <article className="flex items-center gap-3 rounded-xl bg-muted/40 p-3">
          <NAvatar
            src={getPersonImage({
              image: null,
              role: "parent",
              gender: parentGenderFromRelationship(profile.relationshipToChildren),
            })}
            title={profile.name}
            subtitle={profile.relationshipToChildren
              ? `${t("dashboard.family.guardian")} · ${profile.relationshipToChildren}`
              : t("dashboard.family.guardian")}
            size="lg"
            className="min-w-0 flex-1"
          />
          <NBadge status={profile.status} />
        </article>

        {familyChildren.slice(0, 2).map((child) => {
          const age = ageFromDateOfBirth(child.dateOfBirth);
          return (
            <article className="flex items-center gap-3 rounded-xl bg-muted/40 p-3" key={child.id}>
              <NAvatar
                src={getPersonImage({ image: child.image, role: "child", gender: child.gender })}
                title={child.legalName}
                subtitle={t(age === 1 ? "dashboard.family.yearOld" : "dashboard.family.yearsOld", {
                  count: fmt.number(age),
                })}
                size="lg"
                className="min-w-0 flex-1"
              />
              <NBadge status={child.status} />
            </article>
          );
        })}
      </div>
    </NCard>
  );
}
