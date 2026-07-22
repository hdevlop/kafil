import type { FamilyFundingProgress } from "@/types/funding";

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
