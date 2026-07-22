const PERSON_IMAGE_PATHS = {
  childFemale: "/images/people/child-female.png",
  childMale: "/images/people/child-male.png",
  parentFemale: "/images/people/parent-female.png",
  parentMale: "/images/people/parent-male.png",
  sponsorFemale: "/images/people/sponsor_female.png",
  sponsorMale: "/images/people/sponsor_male.png",
} as const;

export function getChildPersonImage(gender: string) {
  return gender === "F"
    ? PERSON_IMAGE_PATHS.childFemale
    : PERSON_IMAGE_PATHS.childMale;
}

export function getParentPersonImage(relationship: string | null) {
  const normalizedRelationship = relationship?.trim().toLowerCase() ?? "";
  const isFemaleGuardian =
    normalizedRelationship.includes("mother") ||
    normalizedRelationship.includes("female");

  return isFemaleGuardian
    ? PERSON_IMAGE_PATHS.parentFemale
    : PERSON_IMAGE_PATHS.parentMale;
}

export function getFamilyAvatarImage(
  image: string | null,
  relationship: string | null,
) {
  const normalizedImage = image?.trim() ?? "";
  const isPlaceholder = /(^|\/)noavatar\.png(?:$|[?#])/i.test(normalizedImage);

  return normalizedImage && !isPlaceholder
    ? normalizedImage
    : getParentPersonImage(relationship);
}

export function getSponsorAvatarImage(
  image: string | null,
  gender: string | null,
) {
  const normalizedImage = image?.trim() ?? "";
  const isPlaceholder = /(^|\/)noavatar\.png(?:$|[?#])/i.test(normalizedImage);

  if (normalizedImage && !isPlaceholder) return normalizedImage;

  return gender === "F"
    ? PERSON_IMAGE_PATHS.sponsorFemale
    : PERSON_IMAGE_PATHS.sponsorMale;
}
