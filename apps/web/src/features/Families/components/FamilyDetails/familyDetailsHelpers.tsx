import { NBadge } from "najm-kit";

import type {
  FamilyStoredHousingSituation,
  FamilySupportPriority,
} from "../../types";

export const DETAIL_MAX_CHARS = 30;

type HousingTranslationKey =
  | "operator.families.housingOwned"
  | "operator.families.housingRented"
  | "operator.families.housingHosted"
  | "operator.families.housingTemporary"
  | "operator.families.notRecorded";
type PriorityTranslationKey =
  | "operator.families.supportPriorityNormal"
  | "operator.families.supportPriorityHigh"
  | "operator.families.supportPriorityUrgent";

export function housingLabel(
  value: FamilyStoredHousingSituation,
  translate: (key: HousingTranslationKey) => string,
) {
  if (value === "owned") return translate("operator.families.housingOwned");
  if (value === "rented") return translate("operator.families.housingRented");
  if (value === "hosted") return translate("operator.families.housingHosted");
  if (value === "temporary") {
    return translate("operator.families.housingTemporary");
  }
  return translate("operator.families.notRecorded");
}

export function priorityValue(
  value: FamilySupportPriority,
  translate: (key: PriorityTranslationKey) => string,
) {
  if (value === "high") {
    return (
      <NBadge variant="warning">
        {translate("operator.families.supportPriorityHigh")}
      </NBadge>
    );
  }
  if (value === "urgent") {
    return (
      <NBadge variant="destructive">
        {translate("operator.families.supportPriorityUrgent")}
      </NBadge>
    );
  }
  return (
    <NBadge variant="outline">
      {translate("operator.families.supportPriorityNormal")}
    </NBadge>
  );
}
