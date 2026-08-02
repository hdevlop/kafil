const PERSON_IMAGE_PATHS = {
  childFemale: "/images/people/child-female.webp",
  childMale: "/images/people/child-male.webp",
  family: "/images/people/family.webp",
  parentFemale: "/images/people/parent-female.webp",
  parentMale: "/images/people/parent-male.webp",
  sponsorFemale: "/images/people/sponsor_female.webp",
  sponsorMale: "/images/people/sponsor_male.webp",
} as const;

export function getChildPersonImage(gender: string) {
  return gender === "F"
    ? PERSON_IMAGE_PATHS.childFemale
    : PERSON_IMAGE_PATHS.childMale;
}

export function getChildAvatarImage(
  image: string | null | undefined,
  gender: string,
) {
  const normalizedImage = image?.trim() ?? "";
  const isPlaceholder = /(^|\/)noavatar\.png(?:$|[?#])/i.test(normalizedImage);

  return normalizedImage && !isPlaceholder
    ? normalizedImage
    : getChildPersonImage(gender);
}

export function getFamilyPersonImage() {
  return PERSON_IMAGE_PATHS.family;
}

export function getParentPersonImage(relationshipToChildren: string | null) {
  const relationship = relationshipToChildren?.trim().toLowerCase() ?? "";
  const isFemaleParent =
    relationship.includes("mother") ||
    relationship.includes("mom") ||
    relationship.includes("mère") ||
    relationship.includes("madre") ||
    relationship.includes("أم");

  return isFemaleParent
    ? PERSON_IMAGE_PATHS.parentFemale
    : PERSON_IMAGE_PATHS.parentMale;
}

export function getFamilyAvatarImage(image: string | null) {
  const normalizedImage = image?.trim() ?? "";
  const isPlaceholder = /(^|\/)noavatar\.png(?:$|[?#])/i.test(normalizedImage);

  return normalizedImage && !isPlaceholder
    ? normalizedImage
    : PERSON_IMAGE_PATHS.family;
}

export function getSponsorAvatarImage(
  image: string | null,
  gender: string | null,
) {
  const normalizedImage = image?.trim() ?? "";
  const isPlaceholder = /(^|\/)noavatar\.png(?:$|[?#])/i.test(normalizedImage);

  if (normalizedImage && !isPlaceholder) return normalizedImage;

  return getSponsorPersonImage(gender);
}

export function getSponsorPersonImage(gender: string | null) {
  return gender === "F"
    ? PERSON_IMAGE_PATHS.sponsorFemale
    : PERSON_IMAGE_PATHS.sponsorMale;
}
