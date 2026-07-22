export interface OwnSponsorProfile {
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
  createdAt: string;
  updatedAt: string;
}

export interface CreateOwnSponsorProfileInput {
  phone: string;
  cin: string;
  gender: "F" | "M";
  address: string;
  dateOfBirth: string;
}

export interface UpdateOwnSponsorProfileInput {
  phone?: string;
  cin?: string;
  gender?: "F" | "M";
  address?: string;
  dateOfBirth?: string;
}
