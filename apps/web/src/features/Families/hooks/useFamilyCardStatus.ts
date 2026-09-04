import { useTranslation } from "najm-i18n/react";
import { fundingProgressPercent } from "@/shared/FundingProgressCard";

import type { FamilyRecord, SponsorFamilyView } from "../types";

export function useFamilyCardStatus(data: FamilyRecord | SponsorFamilyView) {
  const { t } = useTranslation();

  const fundingStatus = data.funding?.status === "active" ? "active" : "pending";
  const capacityStatus = data.funding?.capacityStatus ?? "open";
  const hasReachedTarget = data.funding
    ? fundingProgressPercent(data.funding) >= 100
    : false;
  const isClosed =
    hasReachedTarget ||
    capacityStatus === "reserved" ||
    capacityStatus === "funded";
  const disabledReason =
    hasReachedTarget || capacityStatus === "funded"
      ? t("funding.funded")
      : capacityStatus === "reserved"
        ? t("funding.reserved")
        : null;
  const supportPriorityLabel =
    data.supportPriority === "urgent"
      ? t("operator.families.supportPriorityUrgent")
      : data.supportPriority === "high"
        ? t("operator.families.supportPriorityHigh")
        : t("operator.families.supportPriorityNormal");

  return {
    fundingStatus,
    capacityStatus,
    hasReachedTarget,
    isClosed,
    disabledReason,
    supportPriorityLabel,
  };
}
