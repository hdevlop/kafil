export interface FamilyDashboardProfile {
  id: string;
  userId: string;
  name: string;
  email: string;
  image: string | null;
  status: "active" | "inactive" | string;
  relationshipToChildren: string | null;
  guardianLegalName: string;
  exactAddress: string;
  phone: string | null;
}

export interface FamilyChildRecord {
  id: string;
  familyProfileId: string;
  legalName: string;
  dateOfBirth: string;
  gender: "F" | "M" | string;
  schoolLevel: string | null;
  clothingSize: string | null;
  shoeSize: string | null;
  status: "active" | "inactive" | string;
  createdAt: string;
  updatedAt: string;
}
