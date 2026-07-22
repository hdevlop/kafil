export interface SponsorRecord {
  id: string;
  userId: string;
  name: string;
  email: string;
  image: string | null;
  emailVerified: boolean;
  status: "active" | "inactive" | string;
  role: string | null;
  phone: string | null;
  cin: string | null;
  gender: "F" | "M" | null;
  address: string | null;
  dateOfBirth: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SponsorProfileInput {
  phone: string;
  cin: string;
  gender: "F" | "M";
  address: string;
  dateOfBirth: string;
  notes?: string | null;
}

export interface CreateSponsorInput extends SponsorProfileInput {
  name: string;
  email: string;
}

export interface UpdateSponsorInput {
  name: string;
  email: string;
  phone?: string;
  cin?: string;
  gender?: "F" | "M";
  address?: string;
  dateOfBirth?: string;
  notes?: string | null;
}

export interface SponsorStatusInput {
  id: string;
  reason: string;
}

export interface CreatedSponsorRecord extends SponsorRecord {
  initialPassword: string;
}
