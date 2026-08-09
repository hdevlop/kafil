"use client";

import { Baby, House, NotebookPen } from "lucide-react";
import { NDetailList, NSection, useNajmFormat } from "najm-kit";

import { ManagedAvatar } from "@/shared/ManagedAvatar";
import { StatusBadge } from "@/shared/StatusBadge";
import { useKafilLanguage } from "@/i18n/useKafilLanguage";
import { Operator, useKafilRole } from "@/shared/Authorization";
import { getPersonImage } from "najm-kit/person-images";

import type { ChildRecord } from "../types";

export function ChildDetails({ child }: Readonly<{ child: ChildRecord }>) {
  const { t } = useKafilLanguage();
  const fmt = useNajmFormat();
  const { isExactFamily } = useKafilRole();
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4 rounded-2xl bg-muted/60 p-4">
        <ManagedAvatar
          src={getPersonImage({ image: child.image, role: "child", gender: child.gender })}
          title={child.legalName}
          subtitle={child.gender === "F" ? t("operator.families.female") : t("operator.families.male")}
          classNames={{ avatar: "bg-muted" }}
        />
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold">{child.legalName}</p>
          <p className="text-sm text-muted-foreground">
            {child.gender === "F" ? t("operator.families.female") : t("operator.families.male")}
          </p>
          <StatusBadge className="mt-2" status={child.status} />
        </div>
      </div>

      <NSection icon={Baby} title={t("operator.families.child")}>
        <NDetailList
          items={[
            { label: t("operator.families.dateOfBirth"), value: fmt.date(child.dateOfBirth) },
            { label: t("operator.families.gender"), value: child.gender === "F" ? t("operator.families.female") : t("operator.families.male") },
            { label: t("operator.families.schoolLevel"), value: child.schoolLevel || t("operator.families.notProvided") },
            { label: t("operator.families.clothingSize"), value: child.clothingSize || t("operator.families.notProvided") },
            { label: t("operator.families.shoeSize"), value: child.shoeSize || t("operator.families.notProvided") },
          ]}
        />
      </NSection>

      <Operator>
        <NSection icon={House} title={t("operator.families.profile")}>
          <NDetailList items={[{ label: "Household ID", value: child.familyProfileId }]} />
        </NSection>
        {!isExactFamily && child.notes !== undefined ? (
          <NSection icon={NotebookPen} title={t("operator.families.notes")}>
            <NDetailList
              items={[
                { label: t("operator.families.notes"), value: child.notes || t("operator.families.noNotes") },
                { label: t("operator.families.created"), value: fmt.date(child.createdAt) },
              ]}
            />
          </NSection>
        ) : null}
      </Operator>
    </div>
  );
}