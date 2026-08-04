import type { FamilyFundingProgress } from "@/types/funding";

export const FAMILY_HOUSING_SITUATIONS = [
  "owned",
  "rented",
  "hosted",
  "temporary",
] as const;
export const FAMILY_STORED_HOUSING_SITUATIONS = [
  ...FAMILY_HOUSING_SITUATIONS,
  "unknown",
] as const;
export const FAMILY_SUPPORT_PRIORITIES = ["normal", "high", "urgent"] as const;

export type FamilyHousingSituation = (typeof FAMILY_HOUSING_SITUATIONS)[number];
export type FamilyStoredHousingSituation =
  (typeof FAMILY_STORED_HOUSING_SITUATIONS)[number];
export type FamilySupportPriority = (typeof FAMILY_SUPPORT_PRIORITIES)[number];

export interface FamilyRecord {
  id: string;
  userId: string;
  name: string;
  email: string;
  image: string | null;
  emailVerified: boolean;
  status: "active" | "inactive" | string;
  role: string | null;
  relationshipToChildren: string | null;
  notes: string | null;
  guardianLegalName: string;
  guardianCin: string | null;
  guardianDateOfBirth: string | null;
  exactAddress: string;
  housingSituation: FamilyStoredHousingSituation;
  registrationDate: string;
  supportPriority: FamilySupportPriority;
  phone: string | null;
  activeChildCount: number;
  activeSponsorCount: number;
  activeSponsorNames?: string[];
  funding?: FamilyFundingProgress | null;
  createdAt: string;
  updatedAt: string;
}

export interface InitialChildInput {
  legalName: string;
  dateOfBirth: string;
  gender: "F" | "M";
  schoolLevel?: string | null;
  clothingSize?: string | null;
  shoeSize?: string | null;
  notes?: string | null;
}

export interface CreateFamilyInput {
  name: string;
  email: string;
  image?: string | null;
  guardianCin: string;
  guardianDateOfBirth: string;
  exactAddress: string;
  housingSituation: FamilyHousingSituation;
  registrationDate: string;
  supportPriority: FamilySupportPriority;
  phone: string;
  fundingTargetMinor: number;
  initialChildren: InitialChildInput[];
  relationshipToChildren?: string | null;
  notes?: string | null;
}

export interface UpdateFamilyInput {
  name?: string;
  email?: string;
  image?: string | null;
  guardianCin?: string;
  guardianDateOfBirth?: string;
  exactAddress?: string;
  housingSituation?: FamilyStoredHousingSituation;
  registrationDate?: string;
  supportPriority?: FamilySupportPriority;
  phone?: string | null;
  relationshipToChildren?: string | null;
  notes?: string | null;
  fundingTargetMinor?: number;
}

export interface CreatedFamilyRecord extends FamilyRecord {
  initialPassword: string;
}

export interface FamilyStatusInput {
  id: string;
  reason: string;
}

export interface SponsorFamilyCatalogEntry {
  id: string;
  assignmentId: string | null;
  name: string;
  image: string | null;
  supportPriority: FamilySupportPriority;
  reference: string;
  activeChildCount: number;
  activeSponsorCount: number;
  funding: FamilyFundingProgress | null;
}

export type SponsorFamilyRelationship = "supported" | "available";

export interface SponsorFamilyView extends SponsorFamilyCatalogEntry {
  relationship: SponsorFamilyRelationship;
}
