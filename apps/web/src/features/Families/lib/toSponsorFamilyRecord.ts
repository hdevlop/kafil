import type { FamilyRecord, SponsorFamilyCatalogEntry } from "../types";

export function toSponsorFamilyRecord(
  entry: SponsorFamilyCatalogEntry,
): FamilyRecord {
  return {
    id: entry.id,
    userId: "",
    name: entry.reference,
    email: "",
    image: entry.image,
    emailVerified: false,
    status: "active",
    role: null,
    relationshipToChildren: null,
    notes: null,
    guardianLegalName: entry.reference,
    guardianCin: null,
    guardianDateOfBirth: null,
    exactAddress: "",
    housingSituation: "unknown",
    registrationDate: "",
    supportPriority: "normal",
    phone: null,
    activeChildCount: entry.activeChildCount,
    activeSponsorCount: 0,
    activeSponsorNames: [],
    funding: entry.funding,
    createdAt: "",
    updatedAt: "",
  };
}