export interface ChildRecord {
  id: string;
  familyProfileId: string;
  legalName: string;
  dateOfBirth: string;
  gender: "F" | "M" | string;
  schoolLevel: string | null;
  clothingSize: string | null;
  shoeSize: string | null;
  notes: string | null;
  status: "active" | "inactive" | string;
  familyStatus: "active" | "inactive" | string;
  guardianLegalName?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FamilyOption {
  id: string;
  name: string;
  guardianLegalName: string;
  exactAddress: string;
  phone: string | null;
}

export interface ChildFieldsInput {
  legalName: string;
  dateOfBirth: string;
  gender: "F" | "M";
  schoolLevel?: string | null;
  clothingSize?: string | null;
  shoeSize?: string | null;
  notes?: string | null;
}

export interface CreateChildInput extends ChildFieldsInput {
  familyProfileId: string;
}

export type UpdateChildInput = ChildFieldsInput;

export interface ChildStatusInput {
  id: string;
  reason: string;
}
