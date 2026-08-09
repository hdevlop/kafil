import type { PersonImageGender } from "najm-kit/person-images";

export function parentGenderFromRelationship(
  relationship: string | null,
): PersonImageGender {
  const normalized = relationship?.trim().toLowerCase() ?? "";
  const isFemaleParent =
    normalized.includes("mother") ||
    normalized.includes("mom") ||
    normalized.includes("mère") ||
    normalized.includes("madre") ||
    normalized.includes("أم");
  if (isFemaleParent) return "F";

  const isMaleParent =
    normalized.includes("father") ||
    normalized.includes("dad") ||
    normalized.includes("père") ||
    normalized.includes("padre") ||
    normalized.includes("أب");
  return isMaleParent ? "M" : null;
}
