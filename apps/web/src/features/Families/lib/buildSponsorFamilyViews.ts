import type {
  SponsorFamilyCatalogEntry,
  SponsorFamilyView,
} from "../types";

export function buildSponsorFamilyViews(
  families: SponsorFamilyCatalogEntry[],
): SponsorFamilyView[] {
  return families.map((family) => ({
    ...family,
    relationship: family.assignmentId ? "supported" : "available",
  }));
}
