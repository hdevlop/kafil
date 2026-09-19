import { FAMILY_RELATIONSHIPS, type FamilyRelationship } from "../types";

type RelationshipItem = { label: string; value: string };
type RelationshipTranslationKey =
  | `operator.families.relationshipOptions.${FamilyRelationship}`
  | "operator.families.relationshipOptions.notProvided";
type Translate = (key: RelationshipTranslationKey) => string;

export function isFamilyRelationship(
  value: string,
): value is FamilyRelationship {
  return (FAMILY_RELATIONSHIPS as readonly string[]).includes(value);
}

// Rows written before the dropdown hold free text. Keep the stored value as its
// own item so editing a family never silently rewrites it.
export function familyRelationshipItems(
  current: string | null | undefined,
  translate: Translate,
): ReadonlyArray<RelationshipItem> {
  // The field is optional, and `other` is a relationship rather than an
  // absence of one, so clearing it needs an item of its own. SelectInput maps
  // the empty string through its own sentinel and hands back `""`.
  const items: RelationshipItem[] = [
    {
      value: "",
      label: translate("operator.families.relationshipOptions.notProvided"),
    },
    ...FAMILY_RELATIONSHIPS.map((value) => ({
      value,
      label: translate(`operator.families.relationshipOptions.${value}`),
    })),
  ];
  const stored = current?.trim();
  if (stored && !isFamilyRelationship(stored)) {
    items.push({ value: stored, label: stored });
  }
  return items;
}

export function familyRelationshipLabel(
  value: string | null | undefined,
  translate: Translate,
) {
  const stored = value?.trim();
  if (!stored) return null;
  return isFamilyRelationship(stored)
    ? translate(`operator.families.relationshipOptions.${stored}`)
    : stored;
}
