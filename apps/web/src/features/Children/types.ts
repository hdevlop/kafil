export interface ChildRecord {
  id: string;
  familyProfileId: string;
  legalName: string;
  dateOfBirth: string;
  gender: "F" | "M";
  image: string | null;
  schoolLevel: string | null;
  clothingSize: string | null;
  shoeSize: string | null;
  notes?: string | null;
  status: "active" | "inactive" | string;
  familyStatus?: string | null;
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
  image?: string | null;
}

export interface UpdateChildInput extends ChildFieldsInput {
  image?: string | null;
}

export interface ChildStatusInput {
  id: string;
  reason: string;
}
