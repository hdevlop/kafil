export function sponsorFamilyReference(familyProfileId: string) {
  const compactId = familyProfileId.replaceAll("-", "");
  return `KF-${compactId.slice(-8).toUpperCase()}`;
}
