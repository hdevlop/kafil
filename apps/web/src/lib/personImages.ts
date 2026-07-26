const PERSON_IMAGE_PATHS = {
  childFemale: "/images/people/child-female.png",
  childMale: "/images/people/child-male.png",
  family: "/images/people/family.png",
  sponsorFemale: "/images/people/sponsor_female.png",
  sponsorMale: "/images/people/sponsor_male.png",
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

  return gender === "F"
    ? PERSON_IMAGE_PATHS.sponsorFemale
    : PERSON_IMAGE_PATHS.sponsorMale;
}
