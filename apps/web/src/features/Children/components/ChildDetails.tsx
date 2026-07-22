"use client";

import { Baby, House, NotebookPen } from "lucide-react";
import { NDetailList, NSection } from "najm-kit";

import { formatKafilDate } from "@/lib/format";
import { StatusBadge } from "@/shared/StatusBadge";
import { useKafilLanguage } from "@/i18n/KafilLanguageProvider";

import type { ChildRecord } from "../types";

export function ChildDetails({ child }: Readonly<{ child: ChildRecord }>) {
  const { t } = useKafilLanguage();
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4 rounded-2xl bg-muted/60 p-4">
        <div className="grid size-12 shrink-0 place-items-center rounded-full bg-primary/10 text-lg font-semibold text-primary">
          {child.legalName.slice(0, 1).toUpperCase()}
        </div>
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
            { label: t("operator.families.dateOfBirth"), value: formatKafilDate(child.dateOfBirth) },
            { label: t("operator.families.gender"), value: child.gender === "F" ? t("operator.families.female") : t("operator.families.male") },
            { label: t("operator.families.schoolLevel"), value: child.schoolLevel || t("operator.families.notProvided") },
            { label: t("operator.families.clothingSize"), value: child.clothingSize || t("operator.families.notProvided") },
            { label: t("operator.families.shoeSize"), value: child.shoeSize || t("operator.families.notProvided") },
          ]}
        />
      </NSection>

      <NSection icon={House} title={t("operator.families.profile")}>
        <NDetailList items={[{ label: "Household ID", value: child.familyProfileId }]} />
      </NSection>

      <NSection icon={NotebookPen} title={t("operator.families.notes")}>
        <NDetailList
          items={[
            { label: t("operator.families.notes"), value: child.notes || t("operator.families.noNotes") },
            { label: t("operator.families.created"), value: formatKafilDate(child.createdAt) },
          ]}
        />
      </NSection>
    </div>
  );
}
