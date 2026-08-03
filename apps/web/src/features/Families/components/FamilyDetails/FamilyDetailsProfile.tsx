"use client";

import { House } from "lucide-react";
import { NDetailItem, NSection } from "najm-kit";

import { useKafilLanguage } from "@/i18n/KafilLanguageProvider";
import { formatKafilDate } from "@/lib/format";
import { OnlySponsor, Operator } from "@/shared/Authorization";

import type { FamilyRecord } from "../../types";
import {
  DETAIL_MAX_CHARS,
  housingLabel,
  priorityValue,
} from "./familyDetailsHelpers";

export function FamilyDetailsProfile({
  family,
}: Readonly<{ family: FamilyRecord }>) {
  const { language, t } = useKafilLanguage();
  const notProvided = t("operator.families.notProvided");

  return (
    <>
      <Operator>
        <NSection icon={House} title={t("operator.families.account")}>
          <NDetailItem
            label={t("operator.families.children")}
            maxChars={DETAIL_MAX_CHARS}
            value={family.activeChildCount}
          />
          <NDetailItem
            label={t("operator.families.sponsors")}
            maxChars={DETAIL_MAX_CHARS}
            value={family.activeSponsorCount}
          />
          <NDetailItem
            label={t("operator.families.sponsorNames")}
            maxChars={DETAIL_MAX_CHARS}
            value={family.activeSponsorNames?.join(", ") || notProvided}
          />
          <NDetailItem
            label={t("operator.families.email")}
            maxChars={DETAIL_MAX_CHARS}
            value={family.email}
          />
          <NDetailItem
            label={t("operator.families.cin")}
            maxChars={DETAIL_MAX_CHARS}
            value={family.guardianCin || notProvided}
          />
          <NDetailItem
            label={t("operator.families.phone")}
            maxChars={DETAIL_MAX_CHARS}
            value={family.phone || notProvided}
          />
          <NDetailItem
            label={t("operator.families.exactAddress")}
            maxChars={DETAIL_MAX_CHARS}
            value={family.exactAddress}
          />
          <NDetailItem
            label={t("operator.families.housingSituation")}
            maxChars={DETAIL_MAX_CHARS}
            value={housingLabel(family.housingSituation, t)}
          />
          <NDetailItem
            label={t("operator.families.registrationDate")}
            maxChars={DETAIL_MAX_CHARS}
            value={formatKafilDate(family.registrationDate, language)}
          />
          <NDetailItem
            label={t("operator.families.supportPriority")}
            maxChars={DETAIL_MAX_CHARS}
            value={priorityValue(family.supportPriority, t)}
          />
          <NDetailItem
            label={t("operator.families.relationship")}
            maxChars={DETAIL_MAX_CHARS}
            value={family.relationshipToChildren || notProvided}
          />
          <NDetailItem
            label={t("operator.families.notes")}
            maxChars={DETAIL_MAX_CHARS}
            value={family.notes || t("operator.families.noNotes")}
          />
          <NDetailItem
            label={t("operator.families.created")}
            maxChars={DETAIL_MAX_CHARS}
            value={formatKafilDate(family.createdAt, language)}
          />
        </NSection>
      </Operator>

      <OnlySponsor>
        <NSection icon={House} title={t("operator.families.account")}>
          <NDetailItem
            label={t("operator.families.children")}
            maxChars={DETAIL_MAX_CHARS}
            value={family.activeChildCount}
          />
          <NDetailItem
            label={t("operator.families.supportPriority")}
            maxChars={DETAIL_MAX_CHARS}
            value={priorityValue(family.supportPriority, t)}
          />
        </NSection>
      </OnlySponsor>
    </>
  );
}
