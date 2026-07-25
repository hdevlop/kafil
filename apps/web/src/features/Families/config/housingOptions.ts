import {
  FAMILY_HOUSING_SITUATIONS,
  type FamilyStoredHousingSituation,
} from "../types";

type HousingItem = { label: string; value: FamilyStoredHousingSituation };

export function familyHousingItems(
  current: FamilyStoredHousingSituation | undefined,
  labels: Readonly<Record<FamilyStoredHousingSituation, string>>,
  unknownLabel: string,
): ReadonlyArray<HousingItem> {
  const items: HousingItem[] = FAMILY_HOUSING_SITUATIONS.map((value) => ({
    value,
    label: labels[value],
  }));
  if (current === "unknown") {
    items.push({ value: "unknown", label: unknownLabel });
  }
  return items;
}
